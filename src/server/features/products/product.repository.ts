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
      jewellery_category: input.jewelleryCategory,
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
    };
    return this.client
      .rpc("save_product_atomic", { p_product_id: null, p_update: values })
      .single();
  }
}
