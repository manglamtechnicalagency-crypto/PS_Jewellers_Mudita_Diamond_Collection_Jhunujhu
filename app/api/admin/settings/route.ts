import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { readJsonWithLimit } from "@/src/lib/request-body";

const homepageSchema = z.object({
  heroEyebrow: z.string().trim().min(1).max(120),
  heroTitle: z.string().trim().min(1).max(180),
  heroDescription: z.string().trim().min(1).max(500),
  primaryCtaLabel: z.string().trim().min(1).max(60),
  primaryCtaHref: z.string().trim().regex(/^\/[a-z0-9/_-]*$/),
}).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error !== null) return errorResponse(auth.error === "forbidden" ? 403 : 401, "unauthorized", "Authentication is required");
  const { data, error } = await auth.client.from("site_settings").select("setting_key, value, updated_at").order("setting_key");
  if (error) return errorResponse(500, "database_error", "Site settings could not be loaded");
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error !== null) return errorResponse(auth.error === "forbidden" ? 403 : 401, "unauthorized", "You do not have permission to edit site settings");
  const bodyResult = await readJsonWithLimit(request, 32_000);
  if (!bodyResult.ok) return errorResponse(bodyResult.reason === "too_large" ? 413 : 400, bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json", bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON");
  const parsed = z.object({ settingKey: z.literal("homepage"), value: homepageSchema }).strict().safeParse(bodyResult.value);
  if (!parsed.success) return errorResponse(422, "validation_error", "Site settings are invalid");
  const { data, error } = await auth.client.from("site_settings").upsert({ setting_key: parsed.data.settingKey, value: parsed.data.value, is_public: true, updated_by: auth.user.id }, { onConflict: "setting_key" }).select("setting_key, value, updated_at").single();
  if (error) return errorResponse(500, "database_error", "Site settings could not be saved");
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
