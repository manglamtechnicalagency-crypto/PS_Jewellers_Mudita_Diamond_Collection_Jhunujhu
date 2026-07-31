import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { deleteObject, publicObjectUrl, uploadObject } from "@/src/lib/r2-server";
import { processQuarantinedMedia } from "@/src/lib/media-processing-server";
import { readFormDataWithLimit } from "@/src/lib/request-body";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/src/lib/product-media-policy";

export const runtime = "nodejs";
const MAX_BYTES = Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES);
const MIME = /^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error === "unauthorized" || auth.error === "mfa_required") return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
  if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to replace media");

  const formResult = await readFormDataWithLimit(request, MAX_BYTES + 32_000);
  if (!formResult.ok) return errorResponse(formResult.reason === "too_large" ? 413 : 400, formResult.reason === "too_large" ? "payload_too_large" : "invalid_form", "Replacement upload is invalid");
  const file = formResult.value.get("file");
  const mediaId = z.string().uuid().safeParse(formResult.value.get("mediaId"));
  if (!(file instanceof File) || !mediaId.success) return errorResponse(422, "validation_error", "Choose a valid replacement file");
  if (file.size <= 0 || file.size > MAX_BYTES) return errorResponse(422, "media_limit", "Replacement exceeds the upload size limit");
  if (!MIME.test(file.type)) return errorResponse(422, "unsupported_media", "This image or video type is not supported");

  const { data: current, error: currentError } = await auth.client.from("media").select("storage_key").eq("id", mediaId.data).is("deleted_at", null).single();
  if (currentError || !current) return errorResponse(404, "not_found", "Media was not found");

  const quarantineKey = `quarantine/replacements/${mediaId.data}/${randomUUID()}.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
  try {
    await uploadObject(quarantineKey, new Uint8Array(await file.arrayBuffer()), file.type);
    const processed = await processQuarantinedMedia(quarantineKey, file.type, file.size);
    const { data, error } = await auth.client.from("media").update({
      storage_key: processed.storageKey,
      previous_storage_key: current.storage_key,
      original_filename: file.name,
      mime_type: file.type,
      file_size_bytes: processed.fileSizeBytes,
      review_status: processed.reviewStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", mediaId.data).is("deleted_at", null).select("id, storage_key, original_filename, mime_type, file_size_bytes, title, alt_text, caption, section_key, is_active, display_order, created_at, updated_at, product_media(product_id, role, display_order, products(id, name, sku, status))").single();
    if (error || !data) throw error ?? new Error("Media update returned no row");
    try { await deleteObject(current.storage_key); } catch (cleanupError) { console.error("[admin-media-replace] previous_object_cleanup_failed", { errorName: cleanupError instanceof Error ? cleanupError.name : "UnknownError" }); }
    return NextResponse.json({ data: { ...data, public_url: publicObjectUrl(data.storage_key), product_links: data.product_media ?? [], product_media: undefined } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    try { await deleteObject(quarantineKey); } catch { /* best-effort cleanup */ }
    console.error("[admin-media-replace] failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(422, "replacement_failed", "Replacement media could not be validated or saved");
  }
}
