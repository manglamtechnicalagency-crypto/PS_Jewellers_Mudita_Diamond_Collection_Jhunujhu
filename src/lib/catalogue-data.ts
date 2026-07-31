import { isJewelleryCategory, type JewelleryCategory, type Product } from "../types";

interface CatalogueRow { [key: string]: unknown; }
interface MediaLink { product_id: string; role: string; media: CatalogueRow | CatalogueRow[] | null; }

const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) => typeof value === "number" ? value : Number(value ?? fallback);

/**
 * Passes the stored classification through unchanged, or returns "" when the
 * row predates migration 0021 and has not been backfilled.
 *
 * It deliberately does NOT fall back to metal_purity or the product name. A
 * guessed category is exactly the production defect being fixed: an
 * unclassified product is simply absent from category pages, which is visible
 * and correctable, rather than silently filed under the wrong metal.
 */
const jewelleryCategory = (value: unknown): JewelleryCategory | "" => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return isJewelleryCategory(normalized) ? normalized : "";
};

export function buildCatalogueProducts(rows: CatalogueRow[], links: MediaLink[]): Product[] {
  const mediaByProduct = new Map<string, Array<{ url: string; mimeType: string }>>();
  for (const link of links) {
    const media = Array.isArray(link.media) ? link.media[0] : link.media;
    const storageKey = text(media?.storage_key);
    const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!storageKey || !publicBase) continue;
    const url = `${publicBase}/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
    const list = mediaByProduct.get(link.product_id) ?? [];
    list.push({ url, mimeType: text(media?.mime_type) });
    mediaByProduct.set(link.product_id, list);
  }
  return rows.map((row) => {
    const media = mediaByProduct.get(text(row.id)) ?? [];
    const images = media.filter((item) => item.mimeType.startsWith("image/")).map((item) => item.url);
    const price = number(row.base_price ?? row.display_price);
    return {
      id: text(row.id), slug: text(row.slug), name: text(row.name), category: text(row.category_name, "Jewellery"),
      jewelleryCategory: jewelleryCategory(row.jewellery_category),
      isNewArrival: Boolean(row.is_new_arrival),
      // publish_at is the publication timestamp; created_at is the fallback for
      // rows published before scheduling existed.
      publishedAt: text(row.publish_at) || text(row.created_at),
      collection: text(row.collection_name), sku: text(row.sku),
      price, offerPrice: number(row.display_price ?? row.base_price), discount: row.discount_value ? text(row.discount_value) : "", availability: text(row.stock_status, "In Stock"),
      hallmark: text(row.hallmark_code), certification: text(row.certification), purity: text(row.metal_purity), weight: row.net_weight_grams ? `${row.net_weight_grams} g` : "", stoneType: text(row.stone_type), occasion: "Everyday",
      image: images[0] ?? "", video: media.find((item) => item.mimeType.startsWith("video/"))?.url, images, rating: number(row.rating_average), reviewsCount: number(row.rating_count),
      badge: row.is_best_seller ? "Best Seller" : row.is_new_arrival ? "New Arrival" : "", tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [], priceOnRequest: Boolean(row.price_on_request),
      highlights: [], description: text(row.long_description ?? row.short_description), specs: {}, care: text(row.care_instructions).split(/\r?\n/).map((item) => item.trim()).filter(Boolean), reviews: [],
    };
  }).filter((product) => product.images.length > 0);
}
