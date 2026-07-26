import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";

function errorResponse(status: number, code: string, message: string) { return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } }); }
export async function PATCH(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error !== null) return errorResponse(auth.error === "forbidden" ? 403 : 401, "unauthorized", "You do not have permission to moderate reviews");
  let body: unknown; try { body = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected", "spam"]), moderationNote: z.string().trim().max(1000).default("") }).strict().safeParse(body);
  if (!parsed.success) return errorResponse(422, "validation_error", "Review moderation fields are invalid");
  const { data, error } = await auth.client.from("product_reviews").update({ status: parsed.data.status, moderation_note: parsed.data.moderationNote, moderated_at: parsed.data.status === "pending" ? null : new Date().toISOString(), moderated_by: parsed.data.status === "pending" ? null : auth.user.id }).eq("id", parsed.data.id).select("id, product_id, status, moderation_note, moderated_at").single();
  if (error) return errorResponse(500, "database_error", "Review could not be moderated");
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
