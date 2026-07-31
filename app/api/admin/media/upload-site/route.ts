import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { deleteObject, publicObjectUrl, uploadObject } from "@/src/lib/r2-server";
import { processQuarantinedMedia } from "@/src/lib/media-processing-server";
import { readFormDataWithLimit } from "@/src/lib/request-body";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/src/lib/product-media-policy";
import { findSiteSection, validateSectionUpload } from "@/src/lib/site-sections";

export const runtime = "nodejs";
const MAX_BYTES = Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES);
const MIME = /^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/;
function errorResponse(status: number, code: string, message: string) { return NextResponse.json({ error: { code, message } }, { status }); }

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error === "unauthorized" || auth.error === "mfa_required") return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
  if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to upload media");
  const formResult = await readFormDataWithLimit(request, MAX_BYTES + 32_000);
  if (!formResult.ok) return errorResponse(413, "payload_too_large", "Upload exceeds the media limit");
  const form = formResult.value;
  const file = form.get("file");
  const sectionKey = z.string().min(1).max(80).safeParse(form.get("sectionKey"));
  if (!(file instanceof File) || !sectionKey.success) return errorResponse(422, "validation_error", "Choose a file and website section");
  const section = findSiteSection(sectionKey.data);
  if (!section || !MIME.test(file.type) || file.size <= 0 || file.size > MAX_BYTES) return errorResponse(422, "media_limit", "This file does not meet the website section requirements");
  const problem = validateSectionUpload(section, { mimeType: file.type, sizeBytes: file.size });
  if (problem) return errorResponse(422, "media_limit", problem);
  const key = `quarantine/site/${sectionKey.data}/${randomUUID()}.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
  try {
    await uploadObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
    const processed = await processQuarantinedMedia(key, file.type, file.size);
    const { data, error } = await auth.client.rpc("register_media", { p_storage_key: processed.storageKey, p_original_filename: file.name, p_mime_type: file.type, p_file_size_bytes: processed.fileSizeBytes, p_title: String(form.get("title") ?? ""), p_alt_text: String(form.get("altText") ?? ""), p_caption: "", p_section_key: sectionKey.data, p_product_id: null, p_role: "gallery", p_display_order: 0 });
    if (error || !data) throw error ?? new Error("Media registration failed");
    await auth.client.from("media").update({ review_status: "approved" }).eq("id", data.id).is("deleted_at", null);
    await auth.client.from("media").update({ section_key: null }).eq("section_key", sectionKey.data).neq("id", data.id).is("deleted_at", null);
    return NextResponse.json({ data: { ...data, public_url: publicObjectUrl(processed.storageKey) } }, { status: 201 });
  } catch (error) {
    try { await deleteObject(key); } catch { /* best effort */ }
    console.error("[admin-media-upload-site] failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(422, "upload_failed", "Media could not be uploaded and registered");
  }
}
