import type { AppState, Product } from "../types";
import Image from "next/image";
import WhatsAppButton from "./WhatsAppButton";

interface ProductCardProps {
  product: Product;
  appState?: AppState;
  compact?: boolean;
}

export default function ProductCard({ product, appState, compact = false }: ProductCardProps) {
  const wished = appState?.wishlist?.includes(product.id);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card transition-shadow hover:shadow-elevated">
      <div className="relative aspect-square overflow-hidden bg-cream">
        <a className="absolute inset-0 z-0" href={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        </a>
        {product.badge ? <span className="absolute left-3 top-3 z-10 rounded-full bg-ink/90 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white">{product.badge}</span> : null}
        <button type="button" aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={wished} onClick={() => appState?.toggleWishlist(product)} className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white/90 text-lg backdrop-blur transition ${wished ? "border-gold-500 bg-gold-500 text-white" : "border-white text-ink-soft hover:border-gold-500 hover:text-gold-600"}`}>
          <span aria-hidden="true">♡</span>
        </button>
      </div>

      <div className={`flex flex-1 flex-col gap-2 p-4 ${compact ? "sm:p-3" : ""}`}>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-gold-600 sm:text-xs">{product.category}</p>
          <h3 className={`font-serif leading-snug text-ink ${compact ? "text-base sm:text-lg" : "text-base sm:text-xl"}`}><a href={`/product/${product.slug}`} className="hover:text-gold-600">{product.name}</a></h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <strong className="font-serif text-base text-gold-600 sm:text-lg">Today&apos;s Price on Request</strong>
          <span className="rounded-full bg-gold-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-700">Luxury gold</span>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted sm:gap-x-3 sm:text-xs">
          <span>{product.purity}</span><span>{product.weight}</span><span>{product.availability}</span>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center">
          <WhatsAppButton product={product} label="Get Price on WhatsApp" className="w-full px-3 text-xs sm:flex-1 sm:text-sm" />
          <a href={`/product/${product.slug}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line px-3 text-center text-sm font-medium text-ink-soft transition-colors hover:border-gold-500 hover:text-gold-600 sm:w-auto sm:shrink-0">View Details</a>
        </div>
      </div>
    </article>
  );
}
