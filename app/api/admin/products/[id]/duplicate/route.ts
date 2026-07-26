import { NextResponse } from "next/server";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

function errorResponse(status: number, code: string, message: string) { return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error !== null) return errorResponse(auth.error === "forbidden" ? 403 : 401, "unauthorized", "You do not have permission to duplicate products");
  const { id } = await params;
  const { data: source, error: sourceError } = await auth.client.from("products").select("*").eq("id", id).is("deleted_at", null).single();
  if (sourceError || !source) return errorResponse(404, "not_found", "Product was not found");
  const suffix = `copy-${Date.now().toString(36)}`;
  const { data, error } = await auth.client.from("products").insert({ ...source, id: undefined, sku: `${source.sku}-${suffix}`.slice(0, 80), slug: `${source.slug}-${suffix}`.slice(0, 160), name: `${source.name} (Copy)`, status: "draft", display_price: null, price_on_request: true, created_at: undefined, updated_at: undefined, created_by: auth.user.id, updated_by: auth.user.id, deleted_at: null, deleted_by: null }).select("id, sku, slug, name, status").single();
  if (error) return errorResponse(500, "database_error", "Product could not be duplicated");
  return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
