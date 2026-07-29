import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { createUploadUrl, publicObjectUrl } from "@/src/lib/r2-server";
import { consumeUploadRateLimit, getTrustedClientKey } from "@/src/lib/upload-rate-limit";
import { validateProductMediaSelection } from "@/src/lib/product-media-policy";

export const runtime = "nodejs";

const MAX_MEDIA_BYTES = 250 * 1024 * 1024;
const requestSchema = z.object({
  contentType: z.string().regex(/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/),
  fileSize: z.number().int().positive().max(MAX_MEDIA_BYTES),
  productId: z.string().uuid().optional(),
  mediaId: z.string().uuid().optional(),
}).strict().refine((value) => !(value.productId && value.mediaId), "A new upload cannot target both a product and existing media");

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const clientKey = getTrustedClientKey(request);
  if (!clientKey.trusted || !clientKey.key) return errorResponse(503, "rate_limit_unavailable", "Upload requests cannot be attributed to a client");
  const limit = await consumeUploadRateLimit(clientKey.key);
  if (limit.limited) return NextResponse.json({ error: { code: "rate_limited", message: "Too many upload requests" } }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfterSeconds) } });
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error === "unauthorized" || auth.error === "mfa_required") return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
  if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to upload media");

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse(400, "invalid_json", "Request body must be valid JSON"); }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, "validation_error", "Media upload details are invalid");

  if (parsed.data.productId) {
    const existing = await auth.client.from("product_media").select("media:media_id(mime_type)").eq("product_id", parsed.data.productId);
    if (existing.error) return errorResponse(500, "database_error", "Product media could not be checked");
    const existingTypes = (existing.data ?? []).map((link) => {
      const media = Array.isArray(link.media) ? link.media[0] : link.media;
      return { type: String(media?.mime_type ?? "") };
    });
    const policy = validateProductMediaSelection([{ type: parsed.data.contentType, size: parsed.data.fileSize }], existingTypes);
    if (!policy.valid) return errorResponse(422, "media_limit", policy.message ?? "Product media is invalid");
  }

  let objectKey: string;
  if (parsed.data.mediaId) {
    const { data: existing, error } = await auth.client
      .from("media")
      .select("storage_key")
      .eq("id", parsed.data.mediaId)
      .is("deleted_at", null)
      .single();
    if (error || !existing) return errorResponse(404, "not_found", "Media was not found");
    const extension = parsed.data.contentType.split("/")[1].replace("jpeg", "jpg");
    objectKey = `quarantine/replacements/${parsed.data.mediaId}/${randomUUID()}.${extension}`;
  } else {
    const extension = parsed.data.contentType.split("/")[1].replace("jpeg", "jpg");
    const prefix = parsed.data.productId ? `products/${parsed.data.productId}` : "site";
    objectKey = `${prefix}/${randomUUID()}.${extension}`;
  }
  try {
    const uploadUrl = await createUploadUrl(objectKey, parsed.data.contentType, parsed.data.fileSize, 600);
    return NextResponse.json({ uploadUrl, objectKey, publicUrl: publicObjectUrl(objectKey) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-media-presign] failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(503, "storage_unavailable", "Cloudflare R2 is not configured or unavailable");
  }
}
