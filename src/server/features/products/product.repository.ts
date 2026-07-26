import type { SupabaseClient } from "@supabase/supabase-js";

const productList = "id, sku, slug, name, display_price, status, stock_quantity, updated_at";

export class ProductRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list() {
    return this.client.from("products").select(productList).is("deleted_at", null).order("display_order").order("updated_at", { ascending: false });
  }

  async create(input: {
    sku: string;
    slug: string;
    name: string;
    shortDescription: string;
    categoryId: string;
    collectionId: string | null;
    priceMode: string;
    basePrice: number | null;
    stockQuantity: number;
    status: string;
    actorId: string;
  }) {
    return this.client.from("products").insert({
      sku: input.sku,
      slug: input.slug,
      name: input.name,
      short_description: input.shortDescription,
      category_id: input.categoryId,
      collection_id: input.collectionId,
      price_mode: input.priceMode,
      base_price: input.basePrice,
      stock_quantity: input.stockQuantity,
      status: input.status,
      created_by: input.actorId,
      updated_by: input.actorId,
    }).select("id, sku, slug, name, status").single();
  }
}
