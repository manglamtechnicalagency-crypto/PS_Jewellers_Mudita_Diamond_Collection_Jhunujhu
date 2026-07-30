import type { Product } from "../types";
import type { SimplePageType } from "../storefront-pages/SimplePage";

/**
 * Single source of truth for every public storefront route.
 *
 * This table exists because four separate lists had drifted apart:
 * `Header.nav`, the `path === "..."` ladder in `src/App.tsx`, `categoryToPath`
 * in `src/data.ts`, and `STATIC_ROUTE_META` in `src/lib/seo.ts`. The result was
 * twelve URLs that carried indexable metadata and appeared in the sitemap while
 * rendering "Page Not Found" at HTTP 200 — including three items in the primary
 * navigation (New In, Bridal, Offers).
 *
 * Anything that needs to know "which URLs exist" must read it from here.
 */

export type CatalogueFilterKind = "all" | "category" | "collection" | "badge" | "offers" | "keyword";

export interface CatalogueRoute {
  path: string;
  /** Short label for the header navigation. */
  label: string;
  /** Heading shown on the listing page. */
  title: string;
  /** Whether this route appears in the primary navigation. */
  inNav: boolean;
  kind: CatalogueFilterKind;
  /**
   * Category name for `kind: "category"` — must match a value in `categories`
   * so the listing page can also preselect its dropdown. For other kinds this
   * is the collection name or badge text.
   */
  value?: string;
  /**
   * For `kind: "keyword"`. Any one term matching is enough. Multiple terms are
   * necessary because Indian jewellery carries regional synonyms — a nose pin is
   * listed as "nath", a long necklace as "haar" — so a single term silently
   * yields an empty page for a URL that is in the sitemap.
   */
  terms?: string[];
  emptyMessage?: string;
}

/** Listing routes: the home page plus everything that renders a product grid. */
export const CATALOGUE_ROUTES: CatalogueRoute[] = [
  { path: "/shop", label: "Shop", title: "Shop All Jewellery", inNav: true, kind: "all" },

  // Previously dead: linked in the header, handled nowhere.
  { path: "/new-arrivals", label: "New In", title: "New Arrivals", inNav: true, kind: "badge", value: "New Arrival", emptyMessage: "No new arrivals just now. Please check back soon." },
  { path: "/gold-jewellery", label: "Gold", title: "Gold Jewellery", inNav: true, kind: "category", value: "Gold Jewellery" },
  { path: "/diamond-jewellery", label: "Diamond", title: "Diamond Jewellery", inNav: true, kind: "category", value: "Diamond Jewellery" },
  { path: "/bridal-collection", label: "Bridal", title: "Bridal Collection", inNav: true, kind: "keyword", terms: ["bridal", "wedding", "dulhan"], emptyMessage: "No bridal pieces are published yet. Please contact the showroom." },
  { path: "/offers", label: "Offers", title: "Current Offers", inNav: true, kind: "offers", emptyMessage: "No offers are running right now. Please check back soon." },

  // Reachable from the footer, homepage tiles, and the sitemap.
  { path: "/silver-jewellery", label: "Silver", title: "Silver Jewellery", inNav: false, kind: "category", value: "Silver Jewellery" },
  { path: "/rings", label: "Rings", title: "Rings", inNav: false, kind: "category", value: "Rings" },
  { path: "/earrings", label: "Earrings", title: "Earrings", inNav: false, kind: "category", value: "Earrings" },
  { path: "/necklaces", label: "Necklaces", title: "Necklaces", inNav: false, kind: "category", value: "Necklaces" },
  { path: "/best-sellers", label: "Best Sellers", title: "Best Sellers", inNav: false, kind: "badge", value: "Best Seller", emptyMessage: "No best sellers are marked yet." },

  // Sub-category listings. These have no dedicated category record, so they
  // match on name, tags, category, and stone type rather than an exact field.
  { path: "/bangles", label: "Bangles", title: "Bangles", inNav: false, kind: "keyword", terms: ["bangle", "kada", "kangan"] },
  { path: "/bracelets", label: "Bracelets", title: "Bracelets", inNav: false, kind: "keyword", terms: ["bracelet"] },
  { path: "/chains", label: "Chains", title: "Chains", inNav: false, kind: "keyword", terms: ["chain", "haar", "rope", "curb"] },
  { path: "/pendants", label: "Pendants", title: "Pendants", inNav: false, kind: "keyword", terms: ["pendant", "locket"] },
  { path: "/mangalsutra", label: "Mangalsutra", title: "Mangalsutra", inNav: false, kind: "keyword", terms: ["mangalsutra"] },
  { path: "/maang-tikka", label: "Maang Tikka", title: "Maang Tikka", inNav: false, kind: "keyword", terms: ["tikka", "maang", "borla"] },
  { path: "/nose-pin", label: "Nose Pin", title: "Nose Pins", inNav: false, kind: "keyword", terms: ["nath", "nose pin", "nose ring", "nathni"] },
  { path: "/anklets", label: "Anklets", title: "Anklets", inNav: false, kind: "keyword", terms: ["anklet", "payal"] },
];

/** Routes rendered by SimplePage, keyed by the `type` prop it expects. */
export const SIMPLE_ROUTES: Record<string, SimplePageType> = {
  "/order-tracking": "tracking",
  "/store-locator": "store",
  "/book-appointment": "appointment",
  "/about": "about",
  "/blog": "blog",
  "/journal": "blog",
  "/contact": "contact",
  "/faq": "faq",
  "/privacy-policy": "privacy",
  "/terms": "terms",
  "/return-policy": "returns",
};

/** `/portfolio` is a legacy alias for `/shop`. */
export const SHOP_ALIASES = ["/portfolio"];

export const NAV_LINKS: Array<[string, string]> = [
  ["Home", "/"],
  ...CATALOGUE_ROUTES.filter((route) => route.inNav).map((route): [string, string] => [route.label, route.path]),
  ["Store", "/store-locator"],
];

export function findCatalogueRoute(path: string): CatalogueRoute | undefined {
  return CATALOGUE_ROUTES.find((route) => route.path === path);
}

/**
 * Every path that renders real content. The sitemap must intersect with this so
 * it can never advertise a URL that resolves to the not-found page.
 */
const RENDERABLE_PATHS: readonly string[] = [
  "/",
  ...CATALOGUE_ROUTES.map((route) => route.path),
  ...SHOP_ALIASES,
  ...Object.keys(SIMPLE_ROUTES),
];

// Built once. isRenderablePath runs per sitemap entry and on every storefront
// request, so rebuilding the array and doing a linear scan each time was wasteful.
const RENDERABLE_SET = new Set(RENDERABLE_PATHS);

export function renderablePaths(): string[] {
  return [...RENDERABLE_PATHS];
}

export function isRenderablePath(path: string): boolean {
  return path.startsWith("/product/") || path.startsWith("/project/") || RENDERABLE_SET.has(path);
}

const haystack = (product: Product) =>
  [product.name, product.category, product.collection, product.stoneType, ...(product.tags ?? [])]
    .join(" ")
    .toLowerCase();

/** Applies a route's filter to the live catalogue. */
export function filterProductsForRoute(route: CatalogueRoute, products: Product[]): Product[] {
  switch (route.kind) {
    case "all":
      return products;
    case "category":
      return products.filter((product) => product.category === route.value);
    case "collection":
      return products.filter((product) => product.collection === route.value);
    case "badge":
      return products.filter((product) => product.badge === route.value);
    case "offers":
      // An offer is a published discount, or an offer price genuinely below the
      // regular price. Price-on-request items never count as discounted.
      return products.filter(
        (product) =>
          !product.priceOnRequest &&
          (Boolean(product.discount) || (product.offerPrice > 0 && product.offerPrice < product.price)),
      );
    case "keyword": {
      const terms = (route.terms ?? (route.value ? [route.value] : [])).map((term) => term.toLowerCase()).filter(Boolean);
      if (!terms.length) return products;
      return products.filter((product) => {
        const text = haystack(product);
        return terms.some((term) => text.includes(term));
      });
    }
    default:
      return products;
  }
}
