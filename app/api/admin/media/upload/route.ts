import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { deleteObject, publicObjectUrl, uploadObject } from "@/src/lib/r2-server";
import { validateProductMediaSelection } from "@/src/lib/product-media-policy";

export const runtime = "nodejs";

const MAX_MEDIA_BYTES = 30 * 1024 * 1024;
const metadataSchema = z.object({
  productId: z.string().uuid(),
  role: z.enum(["primary", "gallery", "hover", "spin", "certificate"]),
  displayOrder: z.coerce.number().int().nonnegative(),
  title: z.string().max(180).default(""),
  altText: z.string().max(180).default(""),
}).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request)) return errorResponse(403, "invalid_origin", "Request origin is not allowed");
  const auth = await requireAdmin(["super_admin", "admin", "editor"]);
  if (auth.error === "not_configured") return errorResponse(503, "not_configured", "Admin storage is not configured");
  if (auth.error === "unauthorized" || auth.error === "mfa_required") return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal") return errorResponse(500, "internal_error", "Admin authentication is temporarily unavailable");
  if (auth.error === "forbidden") return errorResponse(403, "forbidden", "You do not have permission to upload media");

  let form: FormData;
  try { form = await request.formData(); } catch { return errorResponse(400, "invalid_form", "Upload form is invalid"); }
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse(422, "missing_file", "Choose an image or video first");
  if (file.size <= 0 || file.size > MAX_MEDIA_BYTES) return errorResponse(422, "file_too_large", "Media exceeds the upload size limit");
  const metadata = metadataSchema.safeParse({
    productId: form.get("productId"),
    role: form.get("role"),
    displayOrder: form.get("displayOrder"),
    title: form.get("title") ?? "",
    altText: form.get("altText") ?? "",
  });
  if (!metadata.success) return errorResponse(422, "validation_error", "Media fields are invalid");
  if (!/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/.test(file.type)) return errorResponse(422, "unsupported_media", "This media type is not supported");

  const existing = await auth.client.from("product_media").select("media:media_id(mime_type)").eq("product_id", metadata.data.productId);
  if (existing.error) return errorResponse(500, "database_error", "Product media could not be checked");
  const existingTypes = (existing.data ?? []).map((link) => {
    const media = Array.isArray(link.media) ? link.media[0] : link.media;
    return { type: String(media?.mime_type ?? "") };
  });
  const policy = validateProductMediaSelection([{ type: file.type, size: file.size }], existingTypes);
  if (!policy.valid) return errorResponse(422, "media_limit", policy.message ?? "Product media is invalid");

  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const objectKey = `products/${metadata.data.productId}/${randomUUID()}.${extension}`;
  try {
    await uploadObject(objectKey, new Uint8Array(await file.arrayBuffer()), file.type);
    const { data, error } = await auth.client.rpc("register_media", {
      p_storage_key: objectKey,
      p_original_filename: file.name,
      p_mime_type: file.type,
      p_file_size_bytes: file.size,
      p_title: metadata.data.title || file.name,
      p_alt_text: metadata.data.altText || metadata.data.title || file.name,
      p_caption: "",
      p_section_key: null,
      p_product_id: metadata.data.productId,
      p_role: metadata.data.role,
      p_display_order: metadata.data.displayOrder,
    });
    if (error) throw error;
    const { error: approvalError } = await auth.client.from("media").update({ review_status: "approved" }).eq("id", data.id).is("deleted_at", null);
    if (approvalError) throw approvalError;
    return NextResponse.json({ data: { ...data, public_url: publicObjectUrl(objectKey) } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    try { await deleteObject(objectKey); } catch (cleanupError) { console.error("[admin-media-upload] orphan_cleanup_failed", { errorName: cleanupError instanceof Error ? cleanupError.name : "UnknownError" }); }
    console.error("[admin-media-upload] failed", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return errorResponse(500, "upload_failed", "Media could not be uploaded and registered");
  }
}
