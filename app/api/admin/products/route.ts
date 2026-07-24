import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

const productSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  name: z.string().trim().min(1).max(180),
  shortDescription: z.string().trim().max(500).default(""),
  categoryId: z.string().uuid(),
  collectionId: z.string().uuid().nullable().default(null),
  priceMode: z.enum(["fixed", "on_request", "weight_based"]).default("fixed"),
  basePrice: z.number().nonnegative().nullable().default(null),
  stockQuantity: z.number().int().nonnegative().default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
}).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error === "unauthorized") return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to view products");

  const { data, error } = await auth.client.from("products").select("id, sku, slug, name, display_price, status, stock_quantity, updated_at").is("deleted_at", null).order("display_order").order("updated_at", { ascending: false });
  if (error) return errorResponse(500, "database_error", "Products could not be loaded");
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error === "unauthorized") return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to create products");

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON");
  }
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return errorResponse(422, "validation_error", "Product fields are invalid");

  const product = parsed.data;
  const { data, error } = await auth.client.from("products").insert({
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    short_description: product.shortDescription,
    category_id: product.categoryId,
    collection_id: product.collectionId,
    price_mode: product.priceMode,
    base_price: product.basePrice,
    stock_quantity: product.stockQuantity,
    status: product.status,
    created_by: auth.user.id,
    updated_by: auth.user.id,
  }).select("id, sku, slug, name, status").single();

  if (error) return errorResponse(error.code === "23505" ? 409 : 500, error.code === "23505" ? "duplicate_product" : "database_error", error.code === "23505" ? "SKU or slug already exists" : "Product could not be created");
  return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
