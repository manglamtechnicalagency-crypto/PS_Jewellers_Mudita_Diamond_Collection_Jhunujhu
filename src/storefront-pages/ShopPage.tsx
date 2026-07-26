import { useMemo, useState } from "react";
import SiteLayout from "../components/SiteLayout";
import ProductCard from "../components/ProductCard";
import { categories, products } from "../data";
import type { AppState, Product } from "../types";

interface ShopPageProps {
  appState?: AppState;
  initialFilter?: string;
  title?: string;
  customProducts?: Product[];
  emptyMessage?: string;
}

type SortKey = "featured" | "low" | "high" | "rating";

function matchesInitial(product: Product, filter: string): boolean {
  if (!filter) return true;
  if (filter === "Gold") return product.category.includes("Gold") || product.purity.includes("22K") || product.purity.includes("18K");
  // Cross-cutting metal filter: silver pieces keep their real product category
  // (Earrings, Necklaces, Maang Tikka) and also surface here.
  if (filter === "Silver Jewellery") return product.purity.toLowerCase().includes("silver");
  if (filter === "Diamond") return product.category.includes("Diamond") || product.stoneType.includes("Diamond");
  if (filter === "Rings") return product.category.includes("Rings");
  if (filter === "Offers") return Boolean(product.discount);
  if (filter === "New Arrival") return product.badge === "New Arrival" || product.badge === "New";
  if (filter === "Best Seller") return product.badge === "Best Seller" || product.badge === "Popular";
  return product.category === filter || product.collection === filter;
}

export default function ShopPage({
  appState,
  initialFilter = "",
  title = "Shop All Jewellery",
  customProducts,
  emptyMessage = "No jewellery found.",
}: ShopPageProps) {
  const [category, setCategory] = useState(initialFilter);
  const [sort, setSort] = useState<SortKey>("featured");
  const list = customProducts || products;
  const searchTerm = (appState?.searchTerm || "").trim();

  const filtered = useMemo(() => {
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    const searched = list.filter((product) => {
      const searchable = [
        product.name,
        product.id,
        product.category,
        product.collection,
        product.sku,
        product.purity,
        product.weight,
        product.stoneType,
        product.occasion,
        product.description,
        product.tags?.join(" ") ?? "",
        product.highlights?.join(" ") ?? "",
        product.specs ? Object.values(product.specs).join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = terms.length === 0 || terms.every((term) => searchable.includes(term));
      return matchesSearch && matchesInitial(product, category);
    });
    // Price-on-request items carry offerPrice 0, which would otherwise sort them
    // to the very top of "low to high" and the very bottom of "high to low".
    // Park them after the priced items in both directions instead.
    const byPrice = (direction: 1 | -1) => (a: Product, b: Product) => {
      if (a.priceOnRequest && b.priceOnRequest) return a.name.localeCompare(b.name);
      if (a.priceOnRequest) return 1;
      if (b.priceOnRequest) return -1;
      return (a.offerPrice - b.offerPrice) * direction;
    };

    return [...searched].sort((a, b) => {
      if (sort === "low") return byPrice(1)(a, b);
      if (sort === "high") return byPrice(-1)(a, b);
      if (sort === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [searchTerm, category, list, sort]);

  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-4 py-10 sm:px-5 sm:py-12 lg:px-10">
        <div className="mx-auto max-w-content lg:flex lg:flex-col lg:items-center lg:text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm">PS Jewellers</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">
            {searchTerm ? `Showing results for "${searchTerm}"` : "Filter by category, metal and occasion. Every piece lists its weight and hallmarking."}
          </p>
        </div>
      </section>

      {/* Mobile/tablet filters: horizontal chip rail instead of a full-screen vertical list */}
      <div className="sticky top-16 z-20 border-b border-line bg-paper/95 backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            className={`inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
              !category ? "border-gold-500 bg-gold-500 text-white" : "border-line bg-white text-ink-soft"
            }`}
            onClick={() => setCategory("")}
          >
            All Jewellery
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
                category === item ? "border-gold-500 bg-gold-500 text-white" : "border-line bg-white text-ink-soft"
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto grid max-w-content items-start gap-8 px-4 py-8 sm:px-5 lg:grid-cols-[220px_1fr] lg:py-10 lg:px-10">
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:h-fit">
          <h2 className="font-serif text-xl text-ink">Filters</h2>
          <div className="mt-4 flex flex-col gap-1">
            {searchTerm ? (
              <button
                onClick={() => appState?.setSearchTerm("")}
                className="mb-2 self-start text-sm font-medium text-gold-600 hover:underline"
              >
                Clear Search
              </button>
            ) : null}
            <button
              className={`rounded-xs px-3 py-2 text-left text-sm ${!category ? "bg-gold-500 text-white" : "text-ink-soft hover:bg-cream"}`}
              onClick={() => setCategory("")}
            >
              All Jewellery
            </button>
            {categories.map((item) => (
              <button
                key={item}
                className={`rounded-xs px-3 py-2 text-left text-sm ${category === item ? "bg-gold-500 text-white" : "text-ink-soft hover:bg-cream"}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex items-center justify-between gap-4 lg:mb-6">
            <p className="text-sm text-muted">
              {filtered.length} products
              {searchTerm ? (
                <button onClick={() => appState?.setSearchTerm("")} className="ml-2 font-medium text-gold-600 hover:underline lg:hidden">
                  Clear search
                </button>
              ) : null}
            </p>
            <label className="sr-only" htmlFor="shop-sort">
              Sort products
            </label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="min-h-11 rounded-xs border border-line bg-white px-3 text-sm text-ink"
            >
              <option value="featured">Featured</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          {filtered.length ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} appState={appState} />
              ))}
            </div>
          ) : (
            <div className="rounded-xs border border-dashed border-line py-16 text-center text-ink-soft">{emptyMessage}</div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
