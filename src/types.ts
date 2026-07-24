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

export interface CartLine {
  id: string;
  quantity: number;
}

export interface CartProduct extends Product {
  quantity: number;
}

export interface AppState {
  wishlist: string[];
  cart: CartLine[];
  cartProducts: CartProduct[];
  wishlistProducts: Product[];
  recentlyViewed: string[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addToCart: (product: Product) => void;
  updateCart: (id: string, quantity: number) => void;
  toggleWishlist: (product: Product) => void;
  addRecentlyViewed: (product: Product) => void;
}
