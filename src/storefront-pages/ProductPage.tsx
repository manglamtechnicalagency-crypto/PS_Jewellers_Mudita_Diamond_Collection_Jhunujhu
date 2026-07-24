import { useEffect, useMemo, useState } from "react";
import SiteLayout from "../components/SiteLayout";
import ProductCard from "../components/ProductCard";
import { categoryToPath, formatPrice, products, trustItems } from "../data";
import type { AppState, Product } from "../types";

interface ProductPageProps {
  product: Product;
  appState?: AppState;
}

const featureBadges = [
  { label: "Premium Quality" },
  { label: "Lightweight Comfort" },
  { label: "Certified Purity" },
  { label: "Perfect for Gifting" },
];

export default function ProductPage({ product, appState }: ProductPageProps) {
  const [activeImage, setActiveImage] = useState(product.images[0]);

  const related = useMemo(
    () => products.filter((item) => item.id !== product.id && (item.category === product.category || item.collection === product.collection)).slice(0, 4),
    [product],
  );
  const recent = useMemo(
    () => products.filter((item) => appState?.recentlyViewed?.includes(item.id) && item.id !== product.id).slice(0, 4),
    [appState?.recentlyViewed, product.id],
  );

  useEffect(() => {
    appState?.addRecentlyViewed(product);
    setActiveImage(product.images[0]);
    document.title = `${product.name} | PS Jewellers`;
  }, [product.id]);

  const specRows: [string, string][] = [
    ["Metal", product.purity],
    ["Stone", product.stoneType],
    ["Weight", product.weight],
    ["Design", product.collection],
    ["Finish", product.specs.Finish ?? product.hallmark],
    ["Occasion", product.occasion],
    ["SKU", product.sku],
    ["Craftsmanship", "Handcrafted"],
  ];

  return (
    <SiteLayout appState={appState}>
      <section className="mx-auto max-w-content px-5 py-8 lg:px-10 lg:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="Breadcrumb">
          <a href="/" className="hover:text-gold-600">Home</a>
          <span aria-hidden="true">›</span>
          <a href={categoryToPath[product.category] ?? "/shop"} className="hover:text-gold-600">{product.category}</a>
          <span aria-hidden="true">›</span>
          <span className="font-medium text-gold-600">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="aspect-square overflow-hidden rounded-xs bg-cream">
              {product.video && activeImage === product.images[0] ? (
                <video src={product.video} poster={product.image} autoPlay muted loop playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActiveImage(image)}
                  aria-label={`View image ${index + 1} of ${product.name}`}
                  aria-pressed={activeImage === image}
                  className={`aspect-square overflow-hidden rounded-xs border transition-colors ${
                    activeImage === image ? "border-gold-500" : "border-line hover:border-gold-300"
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Traditional Luxury</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">{product.name}</h1>
            <div className="my-5 h-px w-16 bg-gold-500" aria-hidden="true" />

            <p className="italic text-ink-soft">“{product.description}”</p>

            <div className="mt-6 flex items-baseline gap-3">
              <strong className="font-serif text-4xl text-gold-600">{formatPrice(product.offerPrice)}</strong>
              <span className="text-sm text-muted line-through">{formatPrice(product.price)}</span>
            </div>
            <p className="text-xs text-muted">(Approx. Price) · {product.discount}</p>

            <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
              {specRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="font-medium text-ink-soft">{label}</dt>
                  <dd className="text-right text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex items-center gap-3 text-sm text-ink-soft">
              <span>{product.rating} ★</span>
              <span aria-hidden="true">·</span>
              <span>{product.reviewsCount} reviews</span>
              <span aria-hidden="true">·</span>
              <span>{product.availability}</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/contact"
                className="rounded-xs bg-gold-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gold-600"
              >
                Enquire Now
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I'm interested in ${product.name} (${product.sku})`)}`}
                className="rounded-xs border border-gold-500 px-8 py-3.5 text-sm font-semibold text-gold-600 transition-colors hover:bg-gold-500 hover:text-white"
              >
                WhatsApp
              </a>
              <button
                type="button"
                onClick={() => appState?.addToCart(product)}
                className="rounded-xs border border-line px-6 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-gold-500 hover:text-gold-600"
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => appState?.toggleWishlist(product)}
                className="rounded-xs border border-line px-6 py-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-gold-500 hover:text-gold-600"
              >
                {appState?.wishlist?.includes(product.id) ? "Wishlisted ♥" : "Add to Wishlist"}
              </button>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-line pt-8 sm:grid-cols-4">
              {featureBadges.map((feature) => (
                <div key={feature.label} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-300 text-gold-600">✦</span>
                  <span className="text-xs font-medium text-ink-soft">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream py-16">
        <div className="mx-auto max-w-content px-5 text-center lg:px-10">
          <h2 className="font-serif text-3xl text-gold-600">Why You'll Love It</h2>
          <div className="mx-auto my-4 h-px w-16 bg-gold-500" aria-hidden="true" />
          <p className="mx-auto max-w-2xl text-ink-soft">{product.description}</p>
          <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-3 text-left sm:grid-cols-3">
            {product.highlights.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="text-gold-500" aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <h2 className="font-serif text-2xl text-ink">Product Description</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">{product.description}</p>

        <h2 className="mt-10 font-serif text-2xl text-ink">Care Instructions</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-ink-soft">
          {product.care.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-cream py-10">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-6 px-5 sm:grid-cols-4 lg:px-10">
          {trustItems.map((item) => (
            <div key={item} className="text-center">
              <strong className="block font-serif text-lg text-gold-600">{item}</strong>
              <span className="text-xs text-muted">Premium PS assurance</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <h2 className="font-serif text-2xl text-ink">Customer Reviews</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {product.reviews.map((review) => (
            <article key={review.name} className="rounded-xs border border-line bg-white p-6">
              <p className="italic text-ink-soft">“{review.comment}”</p>
              <strong className="mt-3 block text-ink">{review.name}</strong>
              <span className="text-sm text-gold-600">{review.rating} ★</span>
            </article>
          ))}
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
          <h2 className="font-serif text-2xl text-ink">Related Products</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} appState={appState} compact />
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="mx-auto max-w-content px-5 pb-16 lg:px-10">
          <h2 className="font-serif text-2xl text-ink">Recently Viewed</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {recent.map((item) => (
              <ProductCard key={item.id} product={item} appState={appState} compact />
            ))}
          </div>
        </section>
      ) : null}
    </SiteLayout>
  );
}
