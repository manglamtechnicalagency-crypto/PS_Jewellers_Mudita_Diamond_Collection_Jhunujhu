import type { SupabaseClient } from "@supabase/supabase-js";

const productList = "id, slug, name, display_price, status, stock_quantity, updated_at";

export class ProductRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list() {
    return this.client.from("products").select(productList).is("deleted_at", null).order("display_order").order("updated_at", { ascending: false });
  }

  async create(input: {
    slug: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    careInstructions: string;
    categoryId: string;
    metalType: string;
    metalPurity: string;
    metalWeightGrams: number | null;
    grossWeightGrams: number | null;
    netWeightGrams: number | null;
    stoneType: string;
    stoneCarat: number | null;
    stoneClarity: string;
    stoneColour: string;
    stoneCount: number | null;
    certification: string;
    certificateNumber: string;
    hallmarkCode: string;
    collectionId: string | null;
    priceMode: string;
    basePrice: number | null;
    makingCharges: number;
    wastagePercent: number;
    gstPercent: number;
    discountType: "flat" | "percentage" | null;
    discountValue: number;
    stockQuantity: number;
    stockStatus: string;
    status: string;
    actorId: string;
  }) {
    const values = {
      sku: `LEGACY-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase().slice(0, 80),
      slug: input.slug,
      name: input.name,
      short_description: input.shortDescription,
      long_description: input.longDescription,
      care_instructions: input.careInstructions,
      category_id: input.categoryId,
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
