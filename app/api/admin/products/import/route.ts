import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { readJsonWithLimit } from "@/src/lib/request-body";

const columns = [
  "slug",
  "name",
  "categorySlug",
  // Required: a CSV import writes straight to the table, bypassing
  // createProductSchema. Without this column every imported product landed with
  // a NULL jewellery_category and was invisible on every category page, with no
  // error to explain why.
  "jewelleryCategory",
  "collectionSlug",
  "priceMode",
  "basePrice",
  "stockQuantity",
  "status",
] as const;
type Row = Record<(typeof columns)[number], string>;
function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
      continue;
    }
    value += char;
  }
  if (quoted) throw new Error("Unclosed quoted field");
  values.push(value.trim());
  return values;
}
function parseCsv(csv: string): { rows: Row[]; errors: string[] } {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines.length) return { rows: [], errors: ["CSV is empty"] };
  let headers: string[];
  try {
    headers = parseCsvLine(lines[0]);
  } catch {
    return {
      rows: [],
      errors: ["CSV header contains an unclosed quoted field"],
    };
  }
  const errors: string[] = [];
  const missing = columns.filter((column) => !headers.includes(column));
  if (missing.length)
    return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  const rows = lines.slice(1).map((line, index) => {
    let values: string[];
    try {
      values = parseCsvLine(line);
    } catch {
      errors.push(`Row ${index + 2}: unclosed quoted field`);
      values = [];
    }
    const row = Object.fromEntries(
      columns.map((column) => [column, values[headers.indexOf(column)] ?? ""]),
    ) as Row;
    if (!row.slug || !row.name || !row.categorySlug)
      errors.push(
        `Row ${index + 2}: slug, name, and categorySlug are required`,
      );
    if (
      row.priceMode &&
      !["fixed", "on_request", "weight_based"].includes(row.priceMode)
    )
      errors.push(`Row ${index + 2}: invalid priceMode`);
    if (
      row.basePrice &&
      (!Number.isFinite(Number(row.basePrice)) || Number(row.basePrice) < 0)
    )
      errors.push(`Row ${index + 2}: basePrice is invalid`);
    if (
      (!row.priceMode || row.priceMode === "fixed") &&
      (!row.basePrice || !Number.isFinite(Number(row.basePrice)) || Number(row.basePrice) <= 0)
    )
      errors.push(`Row ${index + 2}: fixed products require a positive basePrice`);
    if (row.stockQuantity && (!Number.isInteger(Number(row.stockQuantity)) || Number(row.stockQuantity) < 0))
      errors.push(`Row ${index + 2}: stockQuantity is invalid`);
    if (row.status && !["draft", "published", "archived"].includes(row.status))
      errors.push(`Row ${index + 2}: invalid status`);
    if (row.status === "published")
      errors.push(`Row ${index + 2}: published products must pass the editor media and pricing workflow`);
    return row;
  });
  return { rows, errors };
}
export async function POST(request: Request) {
  if (!hasValidSameOrigin(request))
    return errorResponse(
      403,
      "invalid_origin",
      "Request origin is not allowed",
    );
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error !== null)
    return errorResponse(
      auth.error === "forbidden" ? 403 : 401,
      "unauthorized",
      "You do not have permission to import products",
    );
  const bodyResult = await readJsonWithLimit(request, 2_100_000);
  if (!bodyResult.ok) {
    return errorResponse(
      bodyResult.reason === "too_large" ? 413 : 400,
      bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json",
      bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON",
    );
  }
  const parsed = z
    .object({
      csv: z.string().max(2_000_000),
      commit: z.boolean().default(false),
    })
    .strict()
    .safeParse(bodyResult.value);
  if (!parsed.success)
    return errorResponse(
      422,
      "validation_error",
      "CSV import payload is invalid",
    );
  const parsedCsv = parseCsv(parsed.data.csv);
  if (parsedCsv.errors.length || !parsedCsv.rows.length)
    return errorResponse(
      422,
      "csv_validation_error",
      "CSV validation failed",
      parsedCsv.errors,
    );
  if (!parsed.data.commit)
    return NextResponse.json(
      { data: { rows: parsedCsv.rows, count: parsedCsv.rows.length } },
      { headers: { "Cache-Control": "no-store" } },
    );
  const slugs = [...new Set(parsedCsv.rows.map((row) => row.categorySlug))];
  const collectionSlugs = [
    ...new Set(parsedCsv.rows.map((row) => row.collectionSlug).filter(Boolean)),
  ];
  const duplicateSlugs = parsedCsv.rows
    .map((row) => row.slug)
    .filter((slug, index, all) => all.indexOf(slug) !== index);
  if (duplicateSlugs.length)
    return errorResponse(
      422,
      "csv_validation_error",
      "CSV contains duplicate slug values",
      {
        duplicateSlugs: [...new Set(duplicateSlugs)],
      },
    );
  const { data: taxonomy } = await auth.client
    .from("taxonomy_terms")
    .select("id, kind, slug")
    .in("slug", [...slugs, ...collectionSlugs]);
  const categoryMap = new Map(
    (taxonomy ?? [])
      .filter((term) => term.kind === "category")
      .map((term) => [term.slug, term.id]),
  );
  const collectionMap = new Map(
    (taxonomy ?? [])
      .filter((term) => term.kind === "collection")
      .map((term) => [term.slug, term.id]),
  );
  const missing = slugs.filter((slug) => !categoryMap.has(slug));
  if (missing.length)
    return errorResponse(
      422,
      "taxonomy_error",
      "CSV contains unknown categories",
      missing,
    );
  const invalidCategories = [
    ...new Set(
      parsedCsv.rows
        .map((row) => row.jewelleryCategory.trim().toLowerCase())
        .filter((value) => !["gold", "silver", "diamond", "platinum"].includes(value)),
    ),
  ];
  if (invalidCategories.length)
    return errorResponse(
      422,
      "validation_error",
      "jewelleryCategory must be gold, silver, diamond or platinum",
      invalidCategories,
    );
  const missingCollections = collectionSlugs.filter(
    (slug) => !collectionMap.has(slug),
  );
  if (missingCollections.length)
    return errorResponse(
      422,
      "taxonomy_error",
      "CSV contains unknown collections",
      missingCollections,
    );
  const rows = parsedCsv.rows.map((row) => ({
    sku: `LEGACY-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase().slice(0, 80),
    slug: row.slug,
    name: row.name,
    category_id: categoryMap.get(row.categorySlug),
    jewellery_category: row.jewelleryCategory.trim().toLowerCase(),
    collection_id: row.collectionSlug
      ? collectionMap.get(row.collectionSlug)
      : null,
    price_mode: row.priceMode || "fixed",
    base_price: row.basePrice ? Number(row.basePrice) : null,
    stock_quantity: row.stockQuantity ? Number(row.stockQuantity) : 0,
    status: row.status || "draft",
  }));
  const { data, error } = await auth.client.rpc("import_products_atomic", { p_rows: rows });
  if (error)
    return errorResponse(
      error.code === "23505" ? 409 : error.code === "22023" ? 422 : 500,
      error.code === "23505" ? "duplicate_product" : error.code === "22023" ? "validation_error" : "database_error",
      error.code === "23505"
        ? "CSV contains a duplicate slug"
      : "Products could not be imported",
    );
  const products = Array.isArray(data) ? data : [];
  return NextResponse.json(
    { data: { created: products.length, products } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
