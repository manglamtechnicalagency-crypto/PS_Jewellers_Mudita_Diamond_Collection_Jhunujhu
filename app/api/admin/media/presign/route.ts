import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { createUploadUrl, publicObjectUrl } from "@/src/lib/r2-server";
import { consumeUploadRateLimit, getTrustedClientKey } from "@/src/lib/upload-rate-limit";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, validateProductMediaSelection } from "@/src/lib/product-media-policy";
import { readJsonWithLimit } from "@/src/lib/request-body";
import { findSiteSection, validateSectionUpload } from "@/src/lib/site-sections";

export const runtime = "nodejs";

// Single source of truth: the product media policy owns every size limit. This
// ceiling only bounds the request before the policy runs; the policy then applies
// the tighter per-kind limit (3 MB image / 30 MB video).
const MAX_MEDIA_BYTES = Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES);
const requestSchema = z.object({
  contentType: z.string().regex(/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/),
  fileSize: z.number().int().positive().max(MAX_MEDIA_BYTES),
  productId: z.string().uuid().optional(),
  mediaId: z.string().uuid().optional(),
  sectionKey: z.string().regex(/^[a-z0-9-]+$/).max(80).optional(),
  // Measured by the browser before upload. Advisory — a caller can lie — but the
  // size and type limits are authoritative regardless.
  durationSeconds: z.number().positive().optional(),
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

  const bodyResult = await readJsonWithLimit(request, 16_000);
  if (!bodyResult.ok) return errorResponse(bodyResult.reason === "too_large" ? 413 : 400, bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json", bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON");
  const parsed = requestSchema.safeParse(bodyResult.value);
  if (!parsed.success) return errorResponse(422, "validation_error", "Media upload details are invalid");

  // Runs for every upload, not just product media. A site or replacement asset
  // that skipped this check inherited only the request ceiling above, which let a
  // far larger file through than the policy permits.
  let existingTypes: Array<{ type: string }> = [];
  if (parsed.data.productId) {
    const existing = await auth.client.from("product_media").select("media:media_id(mime_type)").eq("product_id", parsed.data.productId);
    if (existing.error) return errorResponse(500, "database_error", "Product media could not be checked");
    existingTypes = (existing.data ?? []).map((link) => {
      const media = Array.isArray(link.media) ? link.media[0] : link.media;
      return { type: String(media?.mime_type ?? "") };
    });
  }
  const section = findSiteSection(parsed.data.sectionKey);
  if (parsed.data.sectionKey && !section) return errorResponse(422, "validation_error", "Unknown website section");
  if (section) {
    const problem = validateSectionUpload(section, { mimeType: parsed.data.contentType, sizeBytes: parsed.data.fileSize });
    if (problem) return errorResponse(422, "media_limit", problem);
  } else {
    const policy = validateProductMediaSelection([{ type: parsed.data.contentType, size: parsed.data.fileSize, duration: parsed.data.durationSeconds }], existingTypes);
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
    const prefix = parsed.data.productId ? `products/${parsed.data.productId}` : `site/${parsed.data.sectionKey ?? "library"}`;
    objectKey = `quarantine/${prefix}/${randomUUID()}.${extension}`;
  }
  try {
    const uploadUrl = await createUploadUrl(objectKey, parsed.data.contentType, parsed.data.fileSize, 600);
    return NextResponse.json({ uploadUrl, objectKey, publicUrl: publicObjectUrl(objectKey) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin-media-presign] failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(503, "storage_unavailable", "Cloudflare R2 is not configured or unavailable");
  }
}
