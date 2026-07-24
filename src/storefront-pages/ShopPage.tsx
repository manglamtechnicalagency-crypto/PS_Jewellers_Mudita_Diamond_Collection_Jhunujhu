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
  if (filter === "Gold") return product.category.includes("Gold") || product.purity.includes("22K");
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
        product.highlights?.join(" ") ?? "",
        product.specs ? Object.values(product.specs).join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = terms.length === 0 || terms.every((term) => searchable.includes(term));
      return matchesSearch && matchesInitial(product, category);
    });
    return [...searched].sort((a, b) => {
      if (sort === "low") return a.offerPrice - b.offerPrice;
      if (sort === "high") return b.offerPrice - a.offerPrice;
      if (sort === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [searchTerm, category, list, sort]);

  return (
    <SiteLayout appState={appState}>
      <section className="border-b border-line bg-cream px-5 py-12 lg:px-10">
        <div className="mx-auto max-w-content">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">PS Jewellers</p>
          <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">{title}</h1>
          <p className="mt-2 text-ink-soft">
            {searchTerm ? `Showing results for "${searchTerm}"` : "Filter, sort, wishlist and add premium demo products to cart."}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-content gap-8 px-5 py-10 lg:grid-cols-[220px_1fr] lg:px-10">
        <aside>
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
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-muted">{filtered.length} products</p>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="rounded-xs border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="featured">Featured</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          {filtered.length ? (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
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
