/**
 * Shared domain types for the PS Jewellers demo storefront.
 *
 * This is currently the single source of truth for the `Product` shape.
 * When the Supabase/Sanity backend phase lands, these types should be kept
 * in sync with (or generated from) the real schema rather than diverging.
 */

export interface ProductReview {
  name: string;
  rating: number;
  comment: string;
}

/**
 * Primary storefront merchandising category — what a piece *is*, for the
 * purposes of `/gold-jewellery`, `/silver-jewellery` and `/diamond-jewellery`.
 *
 * Deliberately separate from `Product.category` (the jewellery type: Rings,
 * Earrings, …) and from `Product.purity` (material composition). A diamond ring
 * mounted in 18K gold is `"diamond"` with `purity: "18K Gold"`; it belongs on
 * the Diamond page and nowhere near the Gold page. Deriving this from `purity`
 * is the production defect this type exists to make impossible.
 *
 * Values are canonical lowercase. Normalise only at input/migration boundaries.
 */
export type JewelleryCategory = "gold" | "silver" | "diamond" | "platinum";

export const JEWELLERY_CATEGORIES: JewelleryCategory[] = ["gold", "silver", "diamond", "platinum"];

export function isJewelleryCategory(value: unknown): value is JewelleryCategory {
  return typeof value === "string" && (JEWELLERY_CATEGORIES as string[]).includes(value);
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Jewellery type: Rings, Earrings, Necklaces, … Not the metal/stone class. */
  category: string;
  /**
   * Primary merchandising class. Empty string means unclassified legacy data:
   * such a product is excluded from every metal/stone category page rather
   * than guessed into one. See `jewellery_category_audit` in migration 0021.
   */
  jewelleryCategory: JewelleryCategory | "";
  /** Admin-controlled. Drives the NEW badge and the New Arrivals rails. */
  isNewArrival: boolean;
  /** ISO timestamp used to sort New Arrivals. Publication date, else creation. */
  publishedAt: string;
  collection: string;
  sku: string;
  price: number;
  offerPrice: number;
  discount: string;
  availability: string;
  hallmark: string;
  certification: string;
  purity: string;
  weight: string;
  stoneType: string;
  occasion: string;
  image: string;
  video?: string;
  images: string[];
  rating: number;
  reviewsCount: number;
  badge: string;
  /** Free-form search keywords: synonyms, regional names, occasions, materials. */
  tags: string[];
  /** True when no public price is published; the UI shows an enquiry CTA instead. */
  priceOnRequest?: boolean;
  highlights: string[];
  description: string;
  specs: Record<string, string>;
  care: string[];
  reviews: ProductReview[];
}

export interface CollectionEntry {
  title: string;
  copy: string;
  image: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export interface BlogPost {
  title: string;
  date: string;
  image: string;
}

export interface AppState {
  recentlyViewed: string[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addRecentlyViewed: (product: Product) => void;
}

export interface HomepageSettings {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
}
