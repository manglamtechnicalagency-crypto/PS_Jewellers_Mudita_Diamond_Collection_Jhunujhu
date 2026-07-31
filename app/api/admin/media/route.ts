import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteObject, publicObjectUrl } from "@/src/lib/r2-server";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { validateProductMediaSelection } from "@/src/lib/product-media-policy";
import { SITE_SECTION_KEYS, findSiteSection, validateSectionUpload } from "@/src/lib/site-sections";
import { readJsonWithLimit } from "@/src/lib/request-body";
import { processQuarantinedMedia } from "@/src/lib/media-processing-server";

const mediaSchema = z
  .object({
    storageKey: z
      .string()
      .trim()
      .regex(/^(products|site|quarantine)\/[A-Za-z0-9._/-]+$/)
      .max(500),
    originalFilename: z.string().trim().min(1).max(255),
    mimeType: z
      .string()
      .regex(/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/),
    fileSizeBytes: z
      .number()
      .int()
      .positive()
      .max(250 * 1024 * 1024),
    title: z.string().trim().max(180).default(""),
    altText: z.string().trim().max(300).default(""),
    caption: z.string().trim().max(500).default(""),
    // Restricted to declared storefront slots — see the PATCH schema below.
    sectionKey: z
      .union([z.enum(SITE_SECTION_KEYS as [string, ...string[]]), z.null()])
      .default(null),
    productId: z.string().uuid().nullable().default(null),
    role: z
      .enum(["primary", "gallery", "hover", "spin", "certificate"])
      .default("gallery"),
    displayOrder: z.number().int().nonnegative().default(0),
  })
  .strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function admin() {
  return requireAdmin(["super_admin", "admin", "editor"]);
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal")
    return errorResponse(
      500,
      "internal_error",
      "Admin authentication is temporarily unavailable",
    );
  if (auth.error === "forbidden")
    return errorResponse(
      403,
      "forbidden",
      "You do not have permission to view media",
    );

  const { data, error } = await auth.client
    .from("media")
    .select(
      "id, storage_key, original_filename, mime_type, file_size_bytes, title, alt_text, caption, section_key, review_status, is_active, display_order, created_at, updated_at, product_media(product_id, role, display_order, products(id, name, sku, status))",
    )
    .is("deleted_at", null)
    .order("display_order")
    .order("created_at", { ascending: false });
  if (error)
    return errorResponse(500, "database_error", "Media could not be loaded");
  return NextResponse.json(
    {
      data: data.map((item) => ({
        ...item,
        public_url: publicObjectUrl(item.storage_key),
        product_links: item.product_media ?? [],
        product_media: undefined,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasValidSameOrigin(request))
    return errorResponse(
      403,
      "invalid_origin",
      "Request origin is not allowed",
    );
  const auth = await admin();
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal")
    return errorResponse(
      500,
      "internal_error",
      "Admin authentication is temporarily unavailable",
    );
  if (auth.error === "forbidden")
    return errorResponse(
      403,
      "forbidden",
      "You do not have permission to add media",
    );
  const bodyResult = await readJsonWithLimit(request, 64_000);
  if (!bodyResult.ok) {
    return errorResponse(
      bodyResult.reason === "too_large" ? 413 : 400,
      bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json",
      bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON",
    );
  }
  const parsed = mediaSchema.safeParse(bodyResult.value);
  if (!parsed.success)
    return errorResponse(422, "validation_error", "Media fields are invalid");

  const media = parsed.data;
  // Server-side re-check of the section's own limits. The browser validates
  // first for a fast, specific error, but the browser is not a control: this
  // is what actually stops an oversized or wrong-format file being registered
  // against a storefront slot.
  if (media.sectionKey) {
    if (media.productId)
      return errorResponse(422, "validation_error", "Media is either product media or a website section image, not both");
    const section = findSiteSection(media.sectionKey);
    if (!section) return errorResponse(422, "validation_error", "Unknown website section");
    const problem = validateSectionUpload(section, {
      mimeType: media.mimeType,
      sizeBytes: media.fileSizeBytes,
    });
    if (problem) return errorResponse(422, "validation_error", problem);
  }
  if (media.productId) {
    const existing = await auth.client.from("product_media").select("media:media_id(mime_type)").eq("product_id", media.productId);
    if (existing.error) return errorResponse(500, "database_error", "Product media could not be checked");
    const existingTypes = (existing.data ?? []).map((link) => {
      const linked = Array.isArray(link.media) ? link.media[0] : link.media;
      return { type: String(linked?.mime_type ?? "") };
    });
    const policy = validateProductMediaSelection([{ type: media.mimeType, size: media.fileSizeBytes }], existingTypes);
    if (!policy.valid) return errorResponse(422, "media_limit", policy.message ?? "Product media is invalid");
  }
  let processed;
  try {
    processed = await processQuarantinedMedia(media.storageKey, media.mimeType, media.fileSizeBytes);
  } catch (processingError) {
    try { await deleteObject(media.storageKey); } catch { /* best-effort quarantine cleanup */ }
    console.error("[admin-media] unsafe_upload_rejected", { errorName: processingError instanceof Error ? processingError.name : "UnknownError" });
    return errorResponse(422, "unsafe_media", "Media content could not be validated safely");
  }
  if (media.sectionKey) {
    const section = findSiteSection(media.sectionKey)!;
    const problem = validateSectionUpload(section, { mimeType: media.mimeType, sizeBytes: processed.fileSizeBytes, width: processed.width, height: processed.height });
    if (problem) {
      try { await deleteObject(processed.storageKey); } catch { /* best-effort processed object cleanup */ }
      return errorResponse(422, "validation_error", problem);
    }
  }
  const { data, error } = await auth.client.rpc("register_media", {
    p_storage_key: processed.storageKey,
    p_original_filename: media.originalFilename,
    p_mime_type: media.mimeType,
    p_file_size_bytes: processed.fileSizeBytes,
    p_title: media.title,
    p_alt_text: media.altText,
    p_caption: media.caption,
    p_section_key: media.sectionKey,
    p_product_id: media.productId,
    p_role: media.role,
    p_display_order: media.displayOrder,
  });
  if (error) {
    try {
      await deleteObject(processed.storageKey);
    } catch (cleanupError) {
      console.error("[admin-media] orphan_cleanup_failed", {
        errorName:
          cleanupError instanceof Error ? cleanupError.name : "UnknownError",
      });
    }
    return errorResponse(
      error.code === "23505" ? 409 : 500,
      error.code === "23505" ? "duplicate_media" : "database_error",
      error.code === "23505"
        ? "That media object is already registered"
        : "Media could not be registered",
    );
  }
  // Section media is approved on the same terms as product media. Without this
  // it stayed "pending" while /api/public/site-media publishes on is_active
  // alone -- so an unreviewed upload rendered to every visitor while the admin
  // review queue still showed it as awaiting review.
  if (processed.reviewStatus === "approved") {
    const { error: approvalError } = await auth.client
      .from("media")
      .update({ review_status: "approved" })
      .eq("id", data.id)
      .is("deleted_at", null);
    if (approvalError) {
      console.error("[admin-media] media_approval_failed", { errorName: approvalError.message });
      return errorResponse(500, "approval_failed", "Media was registered but could not be approved");
    }
  }
  // A storefront slot holds exactly one live asset, and standing the previous
  // one down is part of publishing -- not a follow-up call the client is
  // trusted to make. Doing it here means a dropped connection or a closed tab
  // after registration cannot leave two rows assigned to one section.
  //
  // Order matters: the new row is already registered, so the section is never
  // empty at any point. Previous rows are only unassigned, never deleted or
  // deactivated, because the same file may be used by a product or another
  // slot.
  if (media.sectionKey && processed.reviewStatus === "approved") {
    const { error: standDownError } = await auth.client
      .from("media")
      .update({ section_key: null })
      .eq("section_key", media.sectionKey)
      .neq("id", data.id)
      .is("deleted_at", null);
    if (standDownError) {
      // The new image is live and correct (the storefront takes the newest
      // row), so this is not a failed publish. Log it and let the admin know
      // the old assignment is still hanging around.
      console.error("[admin-media] section_stand_down_failed", {
        sectionKey: media.sectionKey,
        errorCode: standDownError.code,
      });
      return NextResponse.json(
        {
          data: { ...data, public_url: publicObjectUrl(data.storage_key) },
          warning: {
            code: "previous_section_media_not_cleared",
            message:
              "The new image is live, but the previous one is still assigned to this section. Re-save the section to clear it.",
          },
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  return NextResponse.json(
    { data: { ...data, public_url: publicObjectUrl(data.storage_key) } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  if (!hasValidSameOrigin(request))
    return errorResponse(
      403,
      "invalid_origin",
      "Request origin is not allowed",
    );
  const auth = await requireAdmin(["super_admin", "admin"]);
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal")
    return errorResponse(
      500,
      "internal_error",
      "Admin authentication is temporarily unavailable",
    );
  if (auth.error === "forbidden")
    return errorResponse(
      403,
      "forbidden",
      "Only administrators can delete media",
    );
  const bodyResult = await readJsonWithLimit(request, 16_000);
  if (!bodyResult.ok) {
    return errorResponse(
      bodyResult.reason === "too_large" ? 413 : 400,
      bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json",
      bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON",
    );
  }
  const parsed = z.object({ id: z.string().uuid() }).safeParse(bodyResult.value);
  if (!parsed.success)
    return errorResponse(422, "validation_error", "Media id is invalid");
  const { data: storageKey, error } = await auth.client.rpc("archive_media", {
    p_media_id: parsed.data.id,
  });
  if (error) {
    if (error.code === "P0002")
      return errorResponse(404, "not_found", "Media was not found");
    if (error.code === "42501")
      return errorResponse(403, "forbidden", "Only administrators can delete media");
    console.error("[admin-media] archive_failed", { errorCode: error.code });
    return errorResponse(500, "database_error", "Media could not be deleted");
  }
  try {
    await deleteObject(storageKey);
  } catch (error) {
    console.error("[admin-media] object_delete_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse(
      503,
      "storage_cleanup_pending",
      "Media record was archived; R2 cleanup must be retried",
    );
  }
  return NextResponse.json(
    { data: { id: parsed.data.id } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  if (!hasValidSameOrigin(request))
    return errorResponse(
      403,
      "invalid_origin",
      "Request origin is not allowed",
    );
  const auth = await admin();
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    return errorResponse(401, "unauthorized", "Authentication is required");
  if (auth.error === "internal")
    return errorResponse(
      500,
      "internal_error",
      "Admin authentication is temporarily unavailable",
    );
  if (auth.error === "forbidden")
    return errorResponse(
      403,
      "forbidden",
      "You do not have permission to edit media",
    );
  const bodyResult = await readJsonWithLimit(request, 64_000);
  if (!bodyResult.ok) {
    return errorResponse(
      bodyResult.reason === "too_large" ? 413 : 400,
      bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json",
      bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON",
    );
  }
  const parsed = z
    .object({
      id: z.string().uuid(),
      storageKey: z
        .string()
        .trim()
        .regex(/^(products|site|quarantine)\/[A-Za-z0-9._/-]+$/)
        .optional(),
      title: z.string().trim().max(180).optional(),
      altText: z.string().trim().max(300).optional(),
      caption: z.string().trim().max(500).optional(),
      // Only declared storefront slots are assignable. An arbitrary string here
      // would create a section that no page reads, so the image would look
      // published in the admin and render nowhere.
      sectionKey: z
        .union([z.enum(SITE_SECTION_KEYS as [string, ...string[]]), z.null()])
        .optional(),
      reviewStatus: z.enum(["pending", "approved", "rejected"]).optional(),
      originalFilename: z.string().trim().min(1).max(255).optional(),
      mimeType: z
        .string()
        .regex(/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/)
        .optional(),
      fileSizeBytes: z
        .number()
        .int()
        .positive()
        .max(250 * 1024 * 1024)
        .optional(),
    })
    .strict()
    .superRefine((value, context) => {
      const replacementFields = [
        value.originalFilename,
        value.mimeType,
        value.fileSizeBytes,
      ].filter((field) => field !== undefined).length;
      if (replacementFields !== 0 && replacementFields !== 3)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Replacement metadata must be complete",
        });
    })
    .safeParse(bodyResult.value);
  if (!parsed.success)
    return errorResponse(422, "validation_error", "Media fields are invalid");
  const { id, ...values } = parsed.data;
  const isReplacement = values.storageKey !== undefined;
  if (isReplacement && (values.originalFilename === undefined || values.mimeType === undefined || values.fileSizeBytes === undefined))
    return errorResponse(422, "validation_error", "Replacement metadata must be complete");
  const { data: current, error: currentError } = await auth.client
    .from("media")
    .select("storage_key, previous_storage_key")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (currentError || !current)
    return errorResponse(404, "not_found", "Media was not found");
  let processedReplacement: Awaited<ReturnType<typeof processQuarantinedMedia>> | null = null;
  if (isReplacement) {
    try {
      processedReplacement = await processQuarantinedMedia(values.storageKey!, values.mimeType!, values.fileSizeBytes!);
    } catch (processingError) {
      try { await deleteObject(values.storageKey!); } catch { /* best-effort quarantine cleanup */ }
      console.error("[admin-media] unsafe_replacement_rejected", { errorName: processingError instanceof Error ? processingError.name : "UnknownError" });
      return errorResponse(422, "unsafe_media", "Replacement media content could not be validated safely");
    }
  }
  if (values.reviewStatus === "approved" && current.storage_key.startsWith("quarantine/"))
    return errorResponse(422, "unsafe_media", "Quarantined video must be reviewed and published by the media processing service");
  const update = {
    ...(processedReplacement === null ? {} : { storage_key: processedReplacement.storageKey, previous_storage_key: current.storage_key }),
    ...(values.title === undefined ? {} : { title: values.title }),
    ...(values.altText === undefined ? {} : { alt_text: values.altText }),
    ...(values.caption === undefined ? {} : { caption: values.caption }),
    ...(values.sectionKey === undefined ? {} : { section_key: values.sectionKey }),
    ...(values.reviewStatus === undefined && !isReplacement
      ? {}
      : { review_status: processedReplacement?.reviewStatus ?? values.reviewStatus }),
    ...(values.originalFilename === undefined
      ? {}
      : { original_filename: values.originalFilename }),
    ...(values.mimeType === undefined ? {} : { mime_type: values.mimeType }),
    ...(values.fileSizeBytes === undefined
      ? {}
      : { file_size_bytes: processedReplacement?.fileSizeBytes ?? values.fileSizeBytes }),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await auth.client
    .from("media")
    .update(update)
    .eq("id", id)
    .is("deleted_at", null)
    .select(
      "id, storage_key, original_filename, mime_type, file_size_bytes, title, alt_text, caption, section_key, is_active, display_order, created_at, updated_at, product_media(product_id, role, display_order, products(id, name, sku, status))",
    )
    .single();
  if (error)
    return errorResponse(500, "database_error", "Media could not be updated");
  if ((values.reviewStatus === "approved" || processedReplacement?.reviewStatus === "approved") && current.storage_key) {
    try {
      await deleteObject(current.storage_key);
      await auth.client
        .from("media")
        .update({ previous_storage_key: null })
        .eq("id", id);
    } catch (cleanupError) {
      console.error("[admin-media] previous_object_cleanup_failed", {
        errorName: cleanupError instanceof Error ? cleanupError.name : "UnknownError",
      });
    }
  }
  return NextResponse.json(
    {
      data: {
        ...data,
        public_url: publicObjectUrl(data.storage_key),
        product_links: data.product_media ?? [],
        product_media: undefined,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
