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

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
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
