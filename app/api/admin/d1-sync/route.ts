import { NextResponse } from "next/server";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { buildCatalogueProducts } from "@/src/lib/catalogue-data";
import { syncD1Catalogue } from "@/src/lib/cloudflare-d1";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return NextResponse.json({ error: { code: "invalid_origin", message: "Request origin is not allowed" } }, { status: 403 });
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return NextResponse.json({ error: { code: "not_configured", message: "Admin storage is not configured" } }, { status: 503 });
  if (auth.error !== null) return NextResponse.json({ error: { code: "unauthorized", message: "Authentication is required" } }, { status: 401 });
  try {
    const { data: rows, error } = await auth.client.from("catalogue_products").select("*").order("display_order");
    if (error) return NextResponse.json({ error: { code: "database_error", message: "Catalogue could not be loaded" } }, { status: 500 });
    const ids = rows.map((row) => row.id);
    // Must match the storefront's media filter in src/lib/catalogue-server.ts.
    // Without the approval check the D1 mirror advertised products the website
    // itself refuses to show.
    const { data: links } = ids.length ? await auth.client.from("product_media").select("product_id, role, media:media_id!inner(storage_key, mime_type, alt_text, review_status)").in("product_id", ids).eq("media.review_status", "approved").order("display_order") : { data: [] };
    const products = buildCatalogueProducts(rows, (links ?? []) as Array<{ product_id: string; role: string; media: Record<string, unknown> | Record<string, unknown>[] | null }>);
    await syncD1Catalogue(products);
    return NextResponse.json({ data: { synchronized: products.length } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[d1] catalogue_sync_failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: { code: "d1_unavailable", message: "Cloudflare D1 is not configured or unavailable" } }, { status: 503 });
  }
}
