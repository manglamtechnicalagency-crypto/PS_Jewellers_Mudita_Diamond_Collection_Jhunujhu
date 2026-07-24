import { formatPrice } from "../data";
import type { AppState, Product } from "../types";

interface ProductCardProps {
  product: Product;
  appState?: AppState;
  compact?: boolean;
}

export default function ProductCard({ product, appState, compact = false }: ProductCardProps) {
  const wished = appState?.wishlist?.includes(product.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xs border border-line bg-white shadow-card transition-shadow hover:shadow-elevated">
      <a className="relative block aspect-square overflow-hidden bg-cream" href={`/product/${product.slug}`}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {product.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
            {product.badge}
          </span>
        ) : null}
      </a>
      <div className={`flex flex-1 flex-col gap-2 p-4 ${compact ? "p-3" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gold-600">{product.category}</p>
            <h3 className={`font-serif text-ink ${compact ? "text-lg" : "text-xl"}`}>
              <a href={`/product/${product.slug}`} className="hover:text-gold-600">
                {product.name}
              </a>
            </h3>
          </div>
          <button
            type="button"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() => appState?.toggleWishlist(product)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
              wished ? "border-gold-500 bg-gold-500 text-white" : "border-line text-ink-soft hover:border-gold-500 hover:text-gold-600"
            }`}
          >
            ♥
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <strong className="font-serif text-lg text-ink">{formatPrice(product.offerPrice)}</strong>
          <span className="text-sm text-muted line-through">{formatPrice(product.price)}</span>
          <em className="text-xs font-semibold not-italic text-gold-600">{product.discount}</em>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{product.purity}</span>
          <span>{product.weight}</span>
          <span>{product.rating} ★</span>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => appState?.addToCart(product)}
            className="flex-1 rounded-xs bg-gold-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gold-600"
          >
            Add to Cart
          </button>
          <a
            href={`/product/${product.slug}`}
            className="rounded-xs border border-line px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            Quick View
          </a>
        </div>
      </div>
    </article>
  );
}
