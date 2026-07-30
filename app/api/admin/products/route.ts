import { NextResponse } from "next/server";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { isApplicationError } from "@/src/server/core/ApplicationError";
import { ProductRepository, ProductService } from "@/src/server/features/products";
import { PRODUCT_PAGE_SIZE } from "@/src/server/features/products/product.repository";
import { publicObjectUrl } from "@/src/lib/r2-server";

const MAX_PAGE_SIZE = 100;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Query params are user input: only positive integers count, everything else falls back. */
function positiveInt(raw: string | null, fallback: number, max: number) {
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
    if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
    if (auth.error === "unauthorized") return errorResponse(401, "unauthorized", "Authentication is required");
    if (auth.error === "mfa_required") return errorResponse(401, "mfa_required", "Two-factor verification is required");
    if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to view products");

    const params = new URL(request.url).searchParams;
    const page = positiveInt(params.get("page"), 1, Number.MAX_SAFE_INTEGER);
    const pageSize = positiveInt(params.get("pageSize"), PRODUCT_PAGE_SIZE, MAX_PAGE_SIZE);

    // Repository directly rather than ProductService: the paged read has to
    // surface the exact `count`, which the service's list() drops.
    const listResult = await new ProductRepository(auth.client).list({ limit: pageSize, offset: (page - 1) * pageSize });
    if (listResult.error) throw listResult.error;
    const products = listResult.data ?? [];
    const total = listResult.count ?? 0;
    const ids = products.map((product) => product.id);
    const media = ids.length
      ? await auth.client.from("product_media").select("product_id, role, display_order, media:media_id(storage_key, mime_type, alt_text)").in("product_id", ids).order("display_order")
      : { data: [], error: null };
    if (media.error) throw media.error;
    const primaryImages = new Map<string, { url: string | null; alt: string }>();
    for (const link of media.data ?? []) {
      const item = Array.isArray(link.media) ? link.media[0] : link.media;
      if (!item || !String(item.mime_type).startsWith("image/")) continue;
      if (link.role !== "primary" && primaryImages.has(link.product_id)) continue;
      primaryImages.set(link.product_id, { url: publicObjectUrl(String(item.storage_key)), alt: String(item.alt_text ?? "") });
    }
    return NextResponse.json({
      data: products.map((product) => ({ ...product, primary_image_url: primaryImages.get(product.id)?.url ?? null, primary_image_alt: primaryImages.get(product.id)?.alt ?? product.name })),
      pagination: { page, pageSize, total },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-products] list_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(500, "internal_error", "Products could not be loaded");
  }
}

export async function POST(request: Request) {
  try {
    if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
    const auth = await requireAdmin(["super_admin", "admin", "editor"]);
    if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
    if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
    if (auth.error === "unauthorized") return errorResponse(401, "unauthorized", "Authentication is required");
    if (auth.error === "mfa_required") return errorResponse(401, "mfa_required", "Two-factor verification is required");
    if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to create products");

    let input: unknown;
    try { input = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
    const service = new ProductService(new ProductRepository(auth.client));
    return NextResponse.json({ data: await service.create(input, auth.user.id) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isApplicationError(error)) return errorResponse(error.status, error.code, error.message);
    console.error("[admin-products] create_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(500, "internal_error", "Product could not be created");
  }
}
