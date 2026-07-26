import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

const linkSchema = z.object({ mediaId: z.string().uuid(), role: z.enum(["primary", "gallery", "hover", "spin", "certificate"]), displayOrder: z.number().int().nonnegative() });
function errorResponse(status: number, code: string, message: string) { return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } }); }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error !== null) return errorResponse(auth.error === "forbidden" ? 403 : 401, "unauthorized", "You do not have permission to order product media");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return errorResponse(422, "validation_error", "Product id is invalid");
  let body: unknown; try { body = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
  const parsed = z.object({ links: z.array(linkSchema).max(100) }).strict().safeParse(body);
  if (!parsed.success) return errorResponse(422, "validation_error", "Media links are invalid");
  const roles = parsed.data.links.filter((link) => link.role === "primary");
  if (roles.length > 1) return errorResponse(422, "validation_error", "Only one primary image is allowed");
  const { error } = await auth.client.rpc("replace_product_media_links", { p_product_id: id, p_links: parsed.data.links });
  if (error) return errorResponse(500, "database_error", "Product media order could not be saved");
  return NextResponse.json({ data: { productId: id, links: parsed.data.links } }, { headers: { "Cache-Control": "no-store" } });
}
