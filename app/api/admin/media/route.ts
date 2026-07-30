import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteObject, publicObjectUrl } from "@/src/lib/r2-server";
import { hasValidSameOrigin, requireAdmin } from "@/src/lib/admin-auth";
import { validateProductMediaSelection } from "@/src/lib/product-media-policy";

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
    sectionKey: z.string().trim().max(100).nullable().default(null),
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON",
    );
  }
  const parsed = mediaSchema.safeParse(body);
  if (!parsed.success)
    return errorResponse(422, "validation_error", "Media fields are invalid");

  const media = parsed.data;
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
  const { data, error } = await auth.client.rpc("register_media", {
    p_storage_key: media.storageKey,
    p_original_filename: media.originalFilename,
    p_mime_type: media.mimeType,
    p_file_size_bytes: media.fileSizeBytes,
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
      await deleteObject(media.storageKey);
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
  if (media.productId) {
    const { error: approvalError } = await auth.client
      .from("media")
      .update({ review_status: "approved" })
      .eq("id", data.id)
      .is("deleted_at", null);
    if (approvalError) {
      console.error("[admin-media] product_media_approval_failed", { errorName: approvalError.message });
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON",
    );
  }
  const parsed = z.object({ id: z.string().uuid() }).safeParse(body);
  if (!parsed.success)
    return errorResponse(422, "validation_error", "Media id is invalid");
  const { data: media, error: lookupError } = await auth.client
    .from("media")
    .select("id, storage_key")
    .eq("id", parsed.data.id)
    .is("deleted_at", null)
    .single();
  if (lookupError || !media)
    return errorResponse(404, "not_found", "Media was not found");
  // Fetch the product names, not just a count. "Unlink this from its product"
  // is useless advice if the admin cannot tell which of 17 products it means —
  // they end up opening each one in turn.
  const { data: links, error: linksError } = await auth.client
    .from("product_media")
    .select("product_id, products(name)")
    .eq("media_id", media.id)
    .limit(5);
  if (linksError)
    return errorResponse(
      500,
      "database_error",
      "Media links could not be checked",
    );
  if (links?.length) {
    const names = links
      .map((link) => {
        const product = (link as { products?: { name?: string } | { name?: string }[] }).products;
        const entry = Array.isArray(product) ? product[0] : product;
        return entry?.name;
      })
      .filter((name): name is string => Boolean(name));
    return errorResponse(
      409,
      "media_in_use",
      names.length
        ? `This image is still used by ${names.join(", ")}. Remove it from that product first, then delete it here.`
        : "This image is still linked to a product. Remove it from that product first, then delete it here.",
    );
  }
  const { error } = await auth.client
    .from("media")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: auth.user.id,
      is_active: false,
    })
    .eq("id", media.id);
  if (error)
    return errorResponse(500, "database_error", "Media could not be deleted");
  try {
    await deleteObject(media.storage_key);
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
    { data: { id: media.id } },
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON",
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
    .safeParse(body);
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
  const update = {
    ...(values.storageKey === undefined ? {} : { storage_key: values.storageKey, previous_storage_key: current.storage_key }),
    ...(values.title === undefined ? {} : { title: values.title }),
    ...(values.altText === undefined ? {} : { alt_text: values.altText }),
    ...(values.caption === undefined ? {} : { caption: values.caption }),
    ...(values.reviewStatus === undefined && !isReplacement
      ? {}
      : { review_status: isReplacement ? "pending" : values.reviewStatus }),
    ...(values.originalFilename === undefined
      ? {}
      : { original_filename: values.originalFilename }),
    ...(values.mimeType === undefined ? {} : { mime_type: values.mimeType }),
    ...(values.fileSizeBytes === undefined
      ? {}
      : { file_size_bytes: values.fileSizeBytes }),
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
  if (values.reviewStatus === "approved" && current.previous_storage_key) {
    try {
      await deleteObject(current.previous_storage_key);
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
