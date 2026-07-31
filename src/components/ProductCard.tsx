import { formatPrice } from "../data";
import type { AppState, Product } from "../types";
import Image from "next/image";
import { whatsappHref } from "../lib/storefront-enquiry";
import WhatsAppIcon from "./WhatsAppIcon";

interface ProductCardProps {
  product: Product;
  appState?: AppState;
  compact?: boolean;
}

/**
 * The NEW badge is owned by `isNewArrival`, not by badge copy. Badge text is
 * editorial and an editor could type "New Arrival" on a piece that is not
 * flagged — which is how the New Arrivals rail and the badge used to disagree.
 * When the flag is set it wins; otherwise any stale "new" wording is dropped.
 */
const STALE_NEW_BADGES = new Set(["new", "new in", "new arrival", "new arrivals", "just in"]);

function badgeText(product: Product): string {
  if (product.isNewArrival) return "New";
  // Only exact newness claims are suppressed on an unflagged product. Matching
  // /\bnew\b/ would also strip legitimate copy such as "New Season".
  return STALE_NEW_BADGES.has(product.badge.trim().toLowerCase()) ? "" : product.badge;
}

export default function ProductCard({ product, compact = false }: ProductCardProps) {
  const badge = badgeText(product);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xs border border-line bg-white shadow-card transition-shadow hover:shadow-elevated">
      <a className="relative block aspect-square overflow-hidden bg-cream" href={`/product/${product.slug}`}>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        {badge ? <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[11px] ${product.isNewArrival ? "bg-gold-600" : "bg-ink/90"}`}>{badge}</span> : null}
      </a>

      <div className={`flex flex-1 flex-col gap-2 p-3 sm:p-4 ${compact ? "sm:p-3" : ""}`}>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-gold-600 sm:text-xs">{product.category}</p>
          <h3 className={`font-serif leading-snug text-ink ${compact ? "text-base sm:text-lg" : "text-base sm:text-xl"}`}><a href={`/product/${product.slug}`} className="hover:text-gold-600">{product.name}</a></h3>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {product.priceOnRequest ? <strong className="font-serif text-base text-gold-600 sm:text-lg">Price on request</strong> : <><strong className="font-serif text-base text-ink sm:text-lg">{formatPrice(product.offerPrice)}</strong><span className="text-xs text-muted line-through sm:text-sm">{formatPrice(product.price)}</span><em className="text-[11px] font-semibold not-italic text-gold-600 sm:text-xs">{product.discount}</em></>}
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted sm:gap-x-3 sm:text-xs"><span>{product.purity}</span><span>{product.weight}</span>{product.reviewsCount > 0 ? <span>{product.rating} ★</span> : null}</div>
        <div className="mt-auto flex flex-col gap-2 pt-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => window.open(whatsappHref(product), "_blank", "noopener,noreferrer")} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xs bg-gold-500 px-3 text-center text-sm font-medium text-white transition-colors hover:bg-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 sm:flex-1"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</button>
          <a href={`/product/${product.slug}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-xs border border-line px-3 text-center text-sm font-medium text-ink-soft transition-colors hover:border-gold-500 hover:text-gold-600 sm:w-auto sm:shrink-0">Quick View</a>
        </div>
      </div>
    </article>
  );
}
