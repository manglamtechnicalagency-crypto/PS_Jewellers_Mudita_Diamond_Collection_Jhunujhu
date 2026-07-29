import { NextResponse } from "next/server";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { isApplicationError } from "@/src/server/core/ApplicationError";
import { ProductRepository, ProductService } from "@/src/server/features/products";
import { publicObjectUrl } from "@/src/lib/r2-server";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
    if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
    if (auth.error === "unauthorized") return errorResponse(401, "unauthorized", "Authentication is required");
    if (auth.error === "mfa_required") return errorResponse(401, "mfa_required", "Two-factor verification is required");
    if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to view products");

    const service = new ProductService(new ProductRepository(auth.client));
    const products = await service.list();
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
    return NextResponse.json({ data: products.map((product) => ({ ...product, primary_image_url: primaryImages.get(product.id)?.url ?? null, primary_image_alt: primaryImages.get(product.id)?.alt ?? product.name })) }, { headers: { "Cache-Control": "no-store" } });
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
