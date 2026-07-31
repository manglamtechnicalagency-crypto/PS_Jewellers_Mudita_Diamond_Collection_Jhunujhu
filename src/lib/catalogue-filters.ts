import { isJewelleryCategory, type JewelleryCategory, type Product } from "../types";

/**
 * Single source of truth for "which products belong in this listing".
 *
 * Every storefront surface — /shop filter buttons, the metal category pages,
 * homepage rails, New Arrivals, search — routes through here. Before this
 * module, each surface re-implemented its own matching from `purity`, `name`,
 * `tags` and `collection` with `String.includes`, which produced two
 * production defects:
 *
 *   1. A diamond ring with `purity: "18K Gold"` appeared under Gold Jewellery,
 *      because Gold was `purity.includes("gold")`.
 *   2. "Rings" matched "ear-RING-s", so every earring appeared under Rings, and
 *      "Necklaces" matched the tags on mangalsutra *bracelets*.
 *
 * Rules that keep those fixed:
 *   * The metal/stone class comes from `product.jewelleryCategory` and nothing
 *     else. Never `purity`, never the name, never tags.
 *   * The jewellery type comes from `product.category`, matched on whole words.
 *   * An unclassified product is excluded, never guessed into a category.
 */

/** Jewellery-type filters shown alongside the metal filters on /shop. */
export const TYPE_FILTERS = ["Rings", "Earrings", "Necklaces"] as const;
export type TypeFilter = (typeof TYPE_FILTERS)[number];

/**
 * Whole-word aliases per type. `product.category` holds values such as
 * "Diamond Rings", "Gold Rings", "Maang Tikka" — matching on tokens keeps
 * "Earrings" out of "Rings" while still catching "Diamond Rings".
 */
const TYPE_KEYWORDS: Record<TypeFilter, string[]> = {
  Rings: ["ring", "rings"],
  Earrings: ["earring", "earrings", "jhumka", "jhumkas", "studs", "tops"],
  Necklaces: ["necklace", "necklaces", "haar", "choker", "mangalsutra"],
};

function words(value: string): string[] {
  return value.toLowerCase().split(/[^a-z]+/i).filter(Boolean);
}

function hasWord(value: string, list: string[]): boolean {
  const found = new Set(words(value));
  return list.some((word) => found.has(word));
}

export function isTypeFilter(value: string): value is TypeFilter {
  return (TYPE_FILTERS as readonly string[]).includes(value);
}

/**
 * Exact classification match. No inference, no fallback: a product with an
 * empty `jewelleryCategory` (legacy row awaiting backfill) matches nothing, so
 * it is visibly missing from category pages rather than silently misfiled.
 */
export function matchesJewelleryCategory(product: Product, category: JewelleryCategory): boolean {
  return product.jewelleryCategory === category;
}

export function matchesJewelleryType(product: Product, type: TypeFilter): boolean {
  // Name is consulted only when a product carries no category at all, which
  // the admin form now prevents for new records.
  const source = product.category?.trim() ? product.category : product.name;
  return hasWord(source, TYPE_KEYWORDS[type]);
}

/**
 * True when the piece is live on the storefront.
 *
 * A `Product` only ever reaches the client through `catalogue_products`, whose
 * definition ends with `where p.status = 'published' and p.deleted_at is null`.
 * Draft, archived and soft-deleted rows are therefore filtered out in SQL and
 * cannot appear here. `buildCatalogueProducts` additionally drops anything with
 * no approved image.
 *
 * This exists so callers read as intent ("only active products") rather than
 * relying on that invariant implicitly. If a future change ever serves
 * unpublished rows to the client, this is the one place to add the check —
 * it must NOT be reimplemented per listing.
 */
export function isActiveProduct(product: Product): boolean {
  // A product with no image is not renderable, and is the one unpublishable
  // state that can survive the view (media approval is revoked separately).
  return product.images.length > 0 || Boolean(product.image);
}

/**
 * Newest first, with a stable tiebreak so two products published in the same
 * second never swap order between renders (which would reshuffle a grid on
 * every navigation).
 */
export function sortByNewest(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const left = Date.parse(b.publishedAt || "") || 0;
    const right = Date.parse(a.publishedAt || "") || 0;
    if (left !== right) return left - right;
    return a.id.localeCompare(b.id);
  });
}

export interface NewArrivalOptions {
  /** Restrict to one merchandising class, e.g. the homepage gold rail. */
  jewelleryCategory?: JewelleryCategory;
  limit?: number;
}

/**
 * New Arrivals is driven by the admin `isNewArrival` flag only. It is never
 * inferred from badge text or keywords: badge copy is display text an editor
 * can change, and "new-arrival" is not a category.
 */
export function newArrivals(products: Product[], options: NewArrivalOptions = {}): Product[] {
  const filtered = products.filter(
    (product) =>
      product.isNewArrival === true &&
      isActiveProduct(product) &&
      (!options.jewelleryCategory || matchesJewelleryCategory(product, options.jewelleryCategory)),
  );
  // Deduplicate by id: callers concatenate lists (gold rail + general rail),
  // and React would warn on — and shoppers would see — the same card twice.
  const seen = new Set<string>();
  const unique = filtered.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
  const sorted = sortByNewest(unique);
  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

/** Products of one merchandising class, catalogue order preserved. */
export function byJewelleryCategory(products: Product[], category: JewelleryCategory): Product[] {
  return products.filter((product) => matchesJewelleryCategory(product, category));
}

/**
 * Resolves a storefront filter label to a predicate.
 * "" and "Recommended" mean "no filter".
 */
export function matchesStorefrontFilter(product: Product, filter: string): boolean {
  if (!filter || filter === "Recommended") return true;
  const category = STOREFRONT_FILTER_TO_CATEGORY[filter];
  if (category) return matchesJewelleryCategory(product, category);
  if (isTypeFilter(filter)) return matchesJewelleryType(product, filter);
  return false;
}

/** Display label → canonical classification. */
export const STOREFRONT_FILTER_TO_CATEGORY: Record<string, JewelleryCategory> = {
  "Gold Jewellery": "gold",
  "Silver Jewellery": "silver",
  "Diamond Jewellery": "diamond",
  "Platinum Jewellery": "platinum",
};

export function categoryFromFilterLabel(label: string): JewelleryCategory | undefined {
  const value = STOREFRONT_FILTER_TO_CATEGORY[label];
  return isJewelleryCategory(value) ? value : undefined;
}
