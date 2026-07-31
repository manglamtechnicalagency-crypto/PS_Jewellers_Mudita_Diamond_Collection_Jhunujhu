import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hasValidSameOrigin,
  requireAdmin,
  type AdminRole,
} from "@/src/lib/admin-auth";
import { readJsonWithLimit } from "@/src/lib/request-body";

const updateSchema = z
  .object({
    sku: z.string().trim().min(1).max(80).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(160)
      .optional(),
    name: z.string().trim().min(1).max(180).optional(),
    shortDescription: z.string().trim().max(500).optional(),
    longDescription: z.string().trim().max(5000).optional(),
    careInstructions: z.string().trim().max(5000).optional(),
    categoryId: z.string().uuid().optional(),
    subcategoryId: z.string().uuid().nullable().optional(),
    collectionId: z.string().uuid().nullable().optional(),
    metalType: z.string().trim().max(40).optional(),
    metalPurity: z.string().trim().max(40).optional(),
    metalWeightGrams: z.number().nonnegative().nullable().optional(),
    grossWeightGrams: z.number().nonnegative().nullable().optional(),
    netWeightGrams: z.number().nonnegative().nullable().optional(),
    stoneType: z.string().trim().max(80).optional(),
    stoneCarat: z.number().nonnegative().nullable().optional(),
    stoneClarity: z.string().trim().max(40).optional(),
    stoneColour: z.string().trim().max(40).optional(),
    stoneCount: z.number().int().nonnegative().nullable().optional(),
    certification: z.string().trim().max(160).optional(),
    certificateNumber: z.string().trim().max(120).optional(),
    hallmarkCode: z.string().trim().max(120).optional(),
    sizeOptions: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
    priceMode: z.enum(["fixed", "on_request", "weight_based"]).optional(),
    basePrice: z.number().nonnegative().nullable().optional(),
    makingCharges: z.number().nonnegative().optional(),
    wastagePercent: z.number().nonnegative().max(100).optional(),
    gstPercent: z.number().nonnegative().max(100).optional(),
    discountType: z.enum(["flat", "percentage"]).nullable().optional(),
    discountValue: z.number().nonnegative().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    reservedQuantity: z.number().int().nonnegative().optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    stockStatus: z
      .enum(["in_stock", "low_stock", "out_of_stock", "made_to_order"])
      .optional(),
    workflowStatus: z
      .enum(["draft", "review", "scheduled", "published", "archived"])
      .optional(),
    publishAt: z.string().datetime().nullable().optional(),
    // Patch semantics: omitted means "leave unchanged". Editing media or the
    // New Arrival flag therefore cannot clear the classification, and vice
    // versa -- the two fields are independent by construction.
    jewelleryCategory: z
      .enum(["gold", "silver", "diamond", "platinum"], {
        message: "Select a jewellery category: gold, silver, diamond or platinum.",
      })
      .optional(),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
    seoTitle: z.string().trim().max(180).optional(),
    seoDescription: z.string().trim().max(500).optional(),
    seoKeywords: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.priceMode === "fixed" && (value.basePrice === undefined || value.basePrice === null || value.basePrice <= 0)) context.addIssue({ code: "custom", path: ["basePrice"], message: "Enter a regular price, or choose Price on request." });
    if (value.discountType === "percentage" && value.discountValue !== undefined && value.discountValue > 100) context.addIssue({ code: "custom", path: ["discountValue"], message: "Percentage discount must be between 1 and 100." });
    if (value.discountType && value.discountValue !== undefined && value.discountValue <= 0) context.addIssue({ code: "custom", path: ["discountValue"], message: "Offer discount must be greater than zero." });
    if (value.discountType === "flat" && value.basePrice !== undefined && value.basePrice !== null && value.discountValue !== undefined && value.discountValue >= value.basePrice) context.addIssue({ code: "custom", path: ["discountValue"], message: "The offer discount must be lower than the regular price." });
  });

const productSelect =
  "id, sku, slug, name, short_description, long_description, care_instructions, category_id, subcategory_id, collection_id, jewellery_category, metal_type, metal_purity, metal_weight_grams, gross_weight_grams, net_weight_grams, stone_type, stone_carat, stone_clarity, stone_colour, stone_count, certification, certificate_number, hallmark_code, size_options, price_mode, base_price, making_charges, wastage_percent, gst_percent, display_price, price_on_request, discount_type, discount_value, stock_quantity, reserved_quantity, low_stock_threshold, sold_at, stock_status, workflow_status, publish_at, is_featured, is_new_arrival, is_best_seller, status, display_order, tags, seo_title, seo_description, seo_keywords, created_at, updated_at";
function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Single origin + auth gate for the mutating handlers.
 *
 * `requireAdmin` costs a Supabase `getUser()` plus an MFA assurance lookup, so
 * the allowed roles are passed in and checked once rather than gating twice
 * (DELETE previously ran the whole round trip a second time just to narrow the
 * role set). Callers that need a stricter role set also supply the 403 message
 * so the wording stays specific to the operation.
 */
async function getAdmin(
  request: Request,
  allowedRoles: AdminRole[] = ["super_admin", "admin", "editor"],
  forbiddenMessage = "You do not have permission to manage products",
) {
  if (!hasValidSameOrigin(request))
    return {
      response: errorResponse(
        403,
        "invalid_origin",
        "Request origin is not allowed",
      ),
    } as const;
  const auth = await requireAdmin(allowedRoles);
  if (auth.error === "not_configured")
    return {
      response: errorResponse(
        503,
        "not_configured",
        "Admin storage is not configured",
      ),
    } as const;
  if (auth.error === "unauthorized" || auth.error === "mfa_required")
    return {
      response: errorResponse(
        401,
        "unauthorized",
        "Authentication is required",
      ),
    } as const;
  if (auth.error === "internal")
    return {
      response: errorResponse(
        500,
        "internal_error",
        "Admin authentication is temporarily unavailable",
      ),
    } as const;
  if (auth.error === "forbidden")
    return {
      response: errorResponse(403, "forbidden", forbiddenMessage),
    } as const;
  return { auth } as const;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await getAdmin(request);
  if ("response" in gate) return gate.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return errorResponse(422, "validation_error", "Product id is invalid");
  const bodyResult = await readJsonWithLimit(request, 256_000);
  if (!bodyResult.ok) {
    return errorResponse(
      bodyResult.reason === "too_large" ? 413 : 400,
      bodyResult.reason === "too_large" ? "payload_too_large" : "invalid_json",
      bodyResult.reason === "too_large" ? "Request body is too large" : "Request body must be valid JSON",
    );
  }
  // These values are derived by the database pricing trigger and are returned
  // by the product read model. Older edit screens could echo them back on
  // save; never pass them to the atomic update function, which intentionally
  // rejects client-controlled derived columns.
  const requestValue =
    bodyResult.value && typeof bodyResult.value === "object" && !Array.isArray(bodyResult.value)
      ? Object.fromEntries(
          Object.entries(bodyResult.value as Record<string, unknown>).filter(
            ([key]) => !["display_price", "price_on_request", "updated_at", "created_at"].includes(key),
          ),
        )
      : bodyResult.value;
  const parsed = updateSchema.safeParse(requestValue);
  if (!parsed.success)
    return errorResponse(422, "validation_error", parsed.error.issues[0]?.message ?? "Product fields are invalid");
  const product = parsed.data;
  const update = {
    ...(product.sku === undefined ? {} : { sku: product.sku }),
    ...(product.slug === undefined ? {} : { slug: product.slug }),
    ...(product.name === undefined ? {} : { name: product.name }),
    ...(product.shortDescription === undefined
      ? {}
      : { short_description: product.shortDescription }),
    ...(product.longDescription === undefined
      ? {}
      : { long_description: product.longDescription }),
    ...(product.careInstructions === undefined
      ? {}
      : { care_instructions: product.careInstructions }),
    ...(product.categoryId === undefined
      ? {}
      : { category_id: product.categoryId }),
    ...(product.subcategoryId === undefined
      ? {}
      : { subcategory_id: product.subcategoryId }),
    ...(product.collectionId === undefined
      ? {}
      : { collection_id: product.collectionId }),
    ...(product.metalType === undefined
      ? {}
      : { metal_type: product.metalType }),
    ...(product.metalPurity === undefined
      ? {}
      : { metal_purity: product.metalPurity }),
    ...(product.metalWeightGrams === undefined
      ? {}
      : { metal_weight_grams: product.metalWeightGrams }),
    ...(product.grossWeightGrams === undefined
      ? {}
      : { gross_weight_grams: product.grossWeightGrams }),
    ...(product.netWeightGrams === undefined
      ? {}
      : { net_weight_grams: product.netWeightGrams }),
    ...(product.stoneType === undefined
      ? {}
      : { stone_type: product.stoneType }),
    ...(product.stoneCarat === undefined
      ? {}
      : { stone_carat: product.stoneCarat }),
    ...(product.stoneClarity === undefined
      ? {}
      : { stone_clarity: product.stoneClarity }),
    ...(product.stoneColour === undefined
      ? {}
      : { stone_colour: product.stoneColour }),
    ...(product.stoneCount === undefined
      ? {}
      : { stone_count: product.stoneCount }),
    ...(product.certification === undefined
      ? {}
      : { certification: product.certification }),
    ...(product.certificateNumber === undefined
      ? {}
      : { certificate_number: product.certificateNumber }),
    ...(product.hallmarkCode === undefined
      ? {}
      : { hallmark_code: product.hallmarkCode }),
    ...(product.sizeOptions === undefined
      ? {}
      : { size_options: product.sizeOptions }),
    ...(product.priceMode === undefined
      ? {}
      : { price_mode: product.priceMode }),
    ...(product.basePrice === undefined
      ? {}
      : { base_price: product.basePrice }),
    ...(product.makingCharges === undefined
      ? {}
      : { making_charges: product.makingCharges }),
    ...(product.wastagePercent === undefined
      ? {}
      : { wastage_percent: product.wastagePercent }),
    ...(product.gstPercent === undefined
      ? {}
      : { gst_percent: product.gstPercent }),
    ...(product.discountType === undefined
      ? {}
      : { discount_type: product.discountType }),
    ...(product.discountValue === undefined
      ? {}
      : { discount_value: product.discountValue }),
    ...(product.stockQuantity === undefined
      ? {}
      : { stock_quantity: product.stockQuantity }),
    ...(product.reservedQuantity === undefined
      ? {}
      : { reserved_quantity: product.reservedQuantity }),
    ...(product.lowStockThreshold === undefined
      ? {}
      : { low_stock_threshold: product.lowStockThreshold }),
    ...(product.stockStatus === undefined
      ? {}
      : { stock_status: product.stockStatus }),
    ...(product.workflowStatus === undefined
      ? {}
      : { workflow_status: product.workflowStatus }),
    ...(product.publishAt === undefined
      ? {}
      : { publish_at: product.publishAt }),
    ...(product.jewelleryCategory === undefined
      ? {}
      : { jewellery_category: product.jewelleryCategory }),
    ...(product.isFeatured === undefined
      ? {}
      : { is_featured: product.isFeatured }),
    ...(product.isNewArrival === undefined
      ? {}
      : { is_new_arrival: product.isNewArrival }),
    ...(product.isBestSeller === undefined
      ? {}
      : { is_best_seller: product.isBestSeller }),
    ...(product.displayOrder === undefined
      ? {}
      : { display_order: product.displayOrder }),
    ...(product.tags === undefined ? {} : { tags: product.tags }),
    ...(product.seoTitle === undefined ? {} : { seo_title: product.seoTitle }),
    ...(product.seoDescription === undefined
      ? {}
      : { seo_description: product.seoDescription }),
    ...(product.seoKeywords === undefined
      ? {}
      : { seo_keywords: product.seoKeywords }),
    ...(product.status === undefined ? {} : { status: product.status }),
    ...(product.priceMode === "on_request"
      ? { price_on_request: true, display_price: null }
      : {}),
  };
  const { data: updated, error } = await gate.auth.client
    .rpc("save_product_atomic", { p_product_id: id, p_update: update })
    .single();
  if (error) {
    // Without this the real cause never reaches anyone: the client is told
    // "Product could not be updated" by design, and nothing was logged, so the
    // failure was undiagnosable even with server logs. Codes only — no row data.
    console.error("[admin-products] update_failed", {
      productId: id,
      code: error.code,
      // PostgREST puts the offending column in `message`; useful and not sensitive.
      message: error.message,
    });
    return errorResponse(
      error.code === "23505" ? 409 : error.code === "P0002" ? 404 : 500,
      error.code === "23505" ? "duplicate_product" : error.code === "P0002" ? "not_found" : "database_error",
      error.code === "23505"
        ? "SKU or slug already exists"
        : "Product could not be updated",
    );
  }
  return NextResponse.json(
    { data: updated },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error === "not_configured")
    return errorResponse(
      503,
      "not_configured",
      "Admin storage is not configured",
    );
  if (auth.error !== null)
    return errorResponse(
      auth.error === "forbidden" ? 403 : 401,
      "unauthorized",
      "Authentication is required",
    );
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return errorResponse(422, "validation_error", "Product id is invalid");
  const [product, media, reviews, pricing] = await Promise.all([
    auth.client
      .from("products")
      .select(productSelect)
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    auth.client
      .from("product_media")
      .select(
        "product_id, media_id, role, display_order, media:media_id(id, storage_key, original_filename, mime_type, title, alt_text, public_url:storage_key)",
      )
      .eq("product_id", id)
      .order("display_order"),
    auth.client
      .from("product_reviews")
      .select(
        "id, author_name, rating, title, body, status, is_verified_purchase, created_at, moderation_note",
      )
      .eq("product_id", id)
      .order("created_at", { ascending: false }),
    auth.client
      .rpc("calculate_product_price", { product_id: id })
      .maybeSingle(),
  ]);
  if (product.error || !product.data)
    return errorResponse(404, "not_found", "Product was not found");
  if (media.error || reviews.error)
    return errorResponse(
      500,
      "database_error",
      "Product details could not be loaded",
    );
  return NextResponse.json(
    {
      data: {
        ...product.data,
        media: media.data ?? [],
        reviews: reviews.data ?? [],
        pricing: pricing.data ?? null,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Delete is admin-only: editors may edit but not remove. One gate, one auth
  // round trip.
  const gate = await getAdmin(
    request,
    ["super_admin", "admin"],
    "Only administrators can delete products",
  );
  if ("response" in gate) return gate.response;
  const auth = gate.auth;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return errorResponse(422, "validation_error", "Product id is invalid");
  const { error } = await auth.client
    .from("products")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: auth.user.id,
      status: "archived",
    })
    .eq("id", id)
    .is("deleted_at", null);
  if (error)
    return errorResponse(500, "database_error", "Product could not be deleted");
  return NextResponse.json(
    { data: { id } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
