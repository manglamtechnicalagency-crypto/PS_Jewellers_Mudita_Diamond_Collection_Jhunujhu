import { useEffect, useMemo, useState } from "react";
import SiteLayout from "../components/SiteLayout";
import ProductCard from "../components/ProductCard";
import WhatsAppButton from "../components/WhatsAppButton";
import { categoryToPath, formatPrice, products, trustItems } from "../data";
import type { AppState, Product } from "../types";
import Image from "next/image";

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
    () =>
      products
        .filter(
          (item) =>
            item.id !== product.id &&
            (item.category === product.category ||
              item.collection === product.collection),
        )
        .slice(0, 4),
    [product],
  );
  const recent = useMemo(
    () =>
      products
        .filter(
          (item) =>
            appState?.recentlyViewed?.includes(item.id) &&
            item.id !== product.id,
        )
        .slice(0, 4),
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
    ["Craftsmanship", "Handcrafted"],
  ];

  return (
    <SiteLayout appState={appState}>
      <section className="mx-auto max-w-content px-4 py-6 sm:px-5 sm:py-8 lg:px-10 lg:py-14">
        <nav
          className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted sm:mb-8 sm:text-sm"
          aria-label="Breadcrumb"
        >
          <a href="/" className="hover:text-gold-600">
            Home
          </a>
          <span aria-hidden="true">›</span>
          <a
            href={categoryToPath[product.category] ?? "/shop"}
            className="hover:text-gold-600"
          >
            {product.category}
          </a>
          <span aria-hidden="true">›</span>
          <span className="font-medium text-gold-600">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xs bg-cream">
              {product.video && activeImage === product.images[0] ? (
                <video
                  src={product.video}
                  poster={product.image}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:gap-3">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActiveImage(image)}
                  aria-label={`View image ${index + 1} of ${product.name}`}
                  aria-pressed={activeImage === image}
                  className={`relative aspect-square overflow-hidden rounded-xs border transition-colors ${
                    activeImage === image
                      ? "border-gold-500"
                      : "border-line hover:border-gold-300"
                  }`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm">
              Traditional Luxury
            </p>
            <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
              {product.name}
            </h1>
            <div className="my-5 h-px w-16 bg-gold-500" aria-hidden="true" />

            <p className="text-sm italic text-ink-soft sm:text-base">
              “{product.description}”
            </p>

            {product.priceOnRequest ? (
              <div className="mt-6">
                <strong className="font-serif text-3xl text-gold-600 sm:text-4xl">
                  Price on request
                </strong>
                <p className="mt-1 text-xs text-muted">
                  Share your requirement and we will confirm weight, size and
                  price.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <strong className="font-serif text-3xl text-gold-600 sm:text-4xl">
                    {formatPrice(product.offerPrice)}
                  </strong>
                  <span className="text-sm text-muted line-through">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Indicative price · {product.discount}
                </p>
              </>
            )}

            <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
              {specRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <dt className="font-medium text-ink-soft">{label}</dt>
                  <dd className="text-right text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex items-center gap-3 text-sm text-ink-soft">
              {product.reviewsCount > 0 ? (
                <>
                  <span>{product.rating} ★</span>
                  <span aria-hidden="true">·</span>
                  <span>{product.reviewsCount} reviews</span>
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              <span>{product.availability}</span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <WhatsAppButton product={product} label="💬 Enquire on WhatsApp" className="col-span-2 min-h-12 px-8 sm:col-span-1" />
            </div>

            <div className="mt-10 grid grid-cols-4 gap-3 border-t border-line pt-8 sm:gap-4">
              {featureBadges.map((feature) => (
                <div
                  key={feature.label}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-300 text-gold-600">
                    ✦
                  </span>
                  <span className="text-xs font-medium text-ink-soft">
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream py-12 sm:py-16">
        <div className="mx-auto max-w-content px-4 text-center sm:px-5 lg:px-10">
          <h2 className="font-serif text-2xl text-gold-600 sm:text-3xl">
            Why You'll Love It
          </h2>
          <div
            className="mx-auto my-4 h-px w-16 bg-gold-500"
            aria-hidden="true"
          />
          <p className="mx-auto max-w-2xl text-ink-soft">
            {product.description}
          </p>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-col flex-wrap gap-x-10 gap-y-2.5 text-left sm:flex-row sm:justify-center">
            {product.highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-ink-soft"
              >
                <span className="text-gold-500" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
        <h2 className="font-serif text-xl text-ink sm:text-2xl">
          Product Description
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">{product.description}</p>

        <h2 className="mt-10 font-serif text-2xl text-ink">
          Care Instructions
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-ink-soft">
          {product.care.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-cream py-10">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-5 px-4 sm:grid-cols-4 sm:gap-6 sm:px-5 lg:px-10">
          {trustItems.map((item) => (
            <div key={item} className="flex flex-col justify-start text-center">
              <strong className="block font-serif text-base leading-snug text-gold-600 sm:text-lg lg:text-base xl:text-lg">
                {item}
              </strong>
              <span className="text-xs text-muted">Premium PS assurance</span>
            </div>
          ))}
        </div>
      </section>

      {product.reviews.length > 0 ? (
        <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
          <h2 className="font-serif text-xl text-ink sm:text-2xl">
            Customer Reviews
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6">
            {product.reviews.map((review) => (
              <article
                key={review.name}
                className="rounded-xs border border-line bg-white p-6"
              >
                <p className="italic text-ink-soft">“{review.comment}”</p>
                <strong className="mt-3 block text-ink">{review.name}</strong>
                <span className="text-sm text-gold-600">{review.rating} ★</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
          <h2 className="font-serif text-xl text-ink sm:text-2xl">
            Related Products
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                appState={appState}
                compact
              />
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="mx-auto max-w-content px-4 pb-12 sm:px-5 sm:pb-16 lg:px-10">
          <h2 className="font-serif text-xl text-ink sm:text-2xl">
            Recently Viewed
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {recent.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                appState={appState}
                compact
              />
            ))}
          </div>
        </section>
      ) : null}
    </SiteLayout>
  );
}
