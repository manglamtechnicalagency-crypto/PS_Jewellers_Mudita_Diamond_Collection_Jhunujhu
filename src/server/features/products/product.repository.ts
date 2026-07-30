import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateProductInput } from "./product.schemas";

const productList = "id, slug, name, display_price, status, stock_quantity, updated_at";

/** Default page size for every admin product listing. */
export const PRODUCT_PAGE_SIZE = 25;

export interface ProductListOptions {
  limit?: number;
  offset?: number;
}

export class ProductRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Paged product listing. Never unbounded: with no options it still caps at
   * PRODUCT_PAGE_SIZE, so a forgotten argument cannot pull the whole catalogue.
   * Returns an exact `count` so callers can render "Showing X–Y of Z".
   */
  async list(options: ProductListOptions = {}) {
    const limit = Number.isFinite(options.limit) && (options.limit as number) > 0 ? Math.floor(options.limit as number) : PRODUCT_PAGE_SIZE;
    const offset = Number.isFinite(options.offset) && (options.offset as number) > 0 ? Math.floor(options.offset as number) : 0;
    return this.client
      .from("products")
      .select(productList, { count: "exact" })
      .is("deleted_at", null)
      .order("display_order")
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);
  }

  /**
   * Recalculates display_price from the pricing inputs, the same way the update
   * route does. Without this a newly created product carries a null
   * display_price and the storefront shows "On request" until someone opens the
   * product and saves it again.
   */
  async reprice(productId: string, actorId: string) {
    const { data: rawCalculation } = await this.client.rpc("calculate_product_price", { product_id: productId }).maybeSingle();
    const calculation = rawCalculation as { is_priceable?: boolean; total?: number } | null;
    if (!calculation?.is_priceable) return null;
    const { data } = await this.client
      .from("products")
      .update({ display_price: calculation.total, price_on_request: false, updated_by: actorId })
      .eq("id", productId)
      .select("id, slug, name, status")
      .single();
    return data;
  }

  async create(input: CreateProductInput & { actorId: string }) {
    const values = {
      // An operator-supplied SKU wins; otherwise generate a unique placeholder.
      sku: input.sku ?? `LEGACY-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase().slice(0, 80),
      slug: input.slug,
      name: input.name,
      short_description: input.shortDescription,
      long_description: input.longDescription,
      care_instructions: input.careInstructions,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      metal_type: input.metalType,
      metal_purity: input.metalPurity,
      metal_weight_grams: input.metalWeightGrams,
      gross_weight_grams: input.grossWeightGrams,
      net_weight_grams: input.netWeightGrams,
      stone_type: input.stoneType,
      stone_carat: input.stoneCarat,
      stone_clarity: input.stoneClarity,
      stone_colour: input.stoneColour,
      stone_count: input.stoneCount,
      certification: input.certification,
      certificate_number: input.certificateNumber,
      hallmark_code: input.hallmarkCode,
      collection_id: input.collectionId,
      size_options: input.sizeOptions,
      price_mode: input.priceMode,
      base_price: input.basePrice,
      making_charges: input.makingCharges,
      wastage_percent: input.wastagePercent,
      gst_percent: input.gstPercent,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      stock_quantity: input.stockQuantity,
      stock_status: input.stockStatus,
      status: input.status,
      workflow_status: input.workflowStatus,
      publish_at: input.publishAt,
      is_featured: input.isFeatured,
      is_new_arrival: input.isNewArrival,
      is_best_seller: input.isBestSeller,
      display_order: input.displayOrder,
      tags: input.tags,
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      seo_keywords: input.seoKeywords,
      created_by: input.actorId,
      updated_by: input.actorId,
    };
    const result = await this.client.from("products").insert(values).select("id, slug, name, status").single();
    const missingCareInstructionsColumn = result.error && (
      result.error.code === "42703" ||
      result.error.code === "PGRST204" ||
      `${result.error.message ?? ""} ${result.error.details ?? ""}`.toLowerCase().includes("care_instructions")
    );
    if (!missingCareInstructionsColumn) return result;
    // Keep product creation compatible until the optional care-instructions migration is applied.
    const legacyValues = { ...values } as Record<string, unknown>;
    delete legacyValues.care_instructions;
    return this.client.from("products").insert(legacyValues).select("id, slug, name, status").single();
  }
}
