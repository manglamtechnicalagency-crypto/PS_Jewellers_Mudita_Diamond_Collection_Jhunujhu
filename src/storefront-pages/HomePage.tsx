import { useEffect, useState, type ReactNode } from "react";
import SiteLayout from "../components/SiteLayout";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { assets, blogPosts, categories, categoryToPath, collections, formatPrice, offers, testimonials, trustItems } from "../data";
import type { AppState, HomepageSettings, Product } from "../types";
import Image from "next/image";

interface HomePageProps {
  appState?: AppState;
  settings: HomepageSettings;
  products: Product[];
}

function SectionTitle({ kicker, title, copy, tone = "light" }: { kicker: string; title: string; copy?: ReactNode; tone?: "light" | "dark" }) {
  return (
    <div className="mb-8 text-center sm:mb-10">
      <p className={tone === "dark" ? "text-xs font-semibold uppercase tracking-[0.24em] text-gold-300 sm:text-sm" : "text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm"}>{kicker}</p>
      <h2 className={tone === "dark" ? "mt-3 font-serif text-2xl leading-tight text-white sm:text-4xl" : "mt-2 font-serif text-2xl leading-snug text-ink sm:text-4xl"}>{title}</h2>
      {copy ? <span className={tone === "dark" ? "mt-3 block text-sm text-white/70 sm:text-base" : "mt-2 block text-sm text-ink-soft sm:text-base"}>{copy}</span> : null}
    </div>
  );
}

export default function HomePage({ appState, settings, products }: HomePageProps) {
  const [loadHeroVideo, setLoadHeroVideo] = useState(false);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setLoadHeroVideo(true), 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);
  const collectionLinks: Record<string, string> = {
    "Heritage Antique": "/silver-jewellery",
    "Celeste Diamonds": "/diamond-jewellery",
    "Maharani Bridal": "/gold-jewellery",
    "Everyday Luxe": "/shop",
    "Oxidised Heritage": "/silver-jewellery",
  };
  const featured = products.slice(0, 8);
  const heroHighlight = products.find((product) => product.badge === "Best Seller") ?? products[0];
  const bestSellers = products.filter((product) => ["Best Seller", "Popular", "Premium", "Loved"].includes(product.badge)).slice(0, 4);
  const newArrivals = products.filter((product) => ["New Arrival", "New", "Minimal"].includes(product.badge)).slice(0, 4);

  return (
    <SiteLayout appState={appState}>
      <section className="relative flex min-h-[78svh] sm:min-h-[85vh] items-end overflow-hidden bg-ink">
        <video
          src={loadHeroVideo ? assets.heroVideo : undefined}
          poster={assets.antiqueNecklace}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" aria-hidden="true" />
        <div className="relative z-10 w-full">
          <div className="mx-auto flex max-w-content flex-col gap-5 px-4 pb-12 pt-20 sm:gap-6 sm:px-5 sm:pb-16 sm:pt-24 lg:px-10 lg:pb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-300 sm:text-sm sm:tracking-[0.3em]">
              {settings.heroEyebrow}
            </p>
            <h1 className="max-w-2xl font-serif text-4xl leading-[1.08] text-white sm:text-6xl lg:text-7xl">
              {settings.heroTitle}
            </h1>
            <p className="max-w-xl text-sm text-white/80 sm:text-base">
              {settings.heroDescription}
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:gap-4 sm:pt-2">
              <a
                href="/shop"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xs bg-gold-500 px-8 text-sm font-semibold text-white transition-colors hover:bg-gold-600 sm:w-auto"
              >
                {settings.primaryCtaLabel}
              </a>
              <a
                href={settings.secondaryCtaHref}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xs border border-white/60 px-8 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-ink sm:w-auto"
              >
                {settings.secondaryCtaLabel}
              </a>
            </div>
          </div>
        </div>
        {/* Driven off the catalogue so it can never advertise a product that has
            been removed, or a price that has changed. */}
        {heroHighlight ? (
          <a
            href={`/product/${heroHighlight.slug}`}
            className="absolute bottom-8 right-8 hidden rounded-xs bg-white/95 p-5 shadow-elevated transition-shadow hover:shadow-card sm:block"
          >
            <strong className="block font-serif text-3xl text-gold-600">
              {heroHighlight.priceOnRequest ? "Price on request" : formatPrice(heroHighlight.offerPrice)}
            </strong>
            <span className="text-sm text-ink">{heroHighlight.name}</span>
            <p className="mt-1 text-xs text-muted">
              {[heroHighlight.hallmark, heroHighlight.purity, heroHighlight.collection].filter(Boolean).join(" · ")}
            </p>
          </a>
        ) : null}
      </section>

      <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
        <SectionTitle kicker="Featured collections" title="Curated for every celebration." copy="Gold, diamond and oxidised silver, grouped the way you shop." />
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-5">
          {collections.map((collection) => (
            <Reveal key={collection.title}>
              <a href={collectionLinks[collection.title] ?? "/shop"} className="group block overflow-hidden rounded-xs border border-line bg-white shadow-card">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={collection.image} alt={collection.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl text-ink">{collection.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{collection.copy}</p>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="category-heading" className="relative overflow-hidden border-y border-white/5 bg-ink py-12 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(193,145,43,0.14),transparent_52%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-content px-5 lg:px-10">
          <div id="category-heading">
            <SectionTitle tone="dark" kicker="Shop by category" title="Find the piece that feels like you." copy="Explore timeless gold, diamond and bridal styles by category." />
          </div>
        </div>
        <ul className="relative mx-auto flex max-w-content list-none flex-wrap justify-center gap-2 px-4 sm:gap-2.5 sm:px-5 lg:gap-3 lg:px-10" aria-label="Jewellery categories">
          {categories.map((category) => (
            <li key={category}>
              <a
                href={categoryToPath[category] ?? "/shop"}
                className="inline-flex min-h-11 items-center rounded-full border border-gold-400/60 bg-white/[0.03] px-4 py-2 text-sm font-medium text-gold-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-300 hover:bg-gold-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:px-5"
              >
                {category}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
        <SectionTitle
          kicker="Featured products"
          title="New arrivals, best sellers and trending jewellery."
          copy="Hallmarking, weights, stone detail and care notes on every piece."
        />
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} appState={appState} />
          ))}
        </div>
      </section>

      <section className="grid gap-1 sm:grid-cols-2">
        <div className="flex flex-col justify-center gap-3 bg-cream px-4 py-10 sm:p-10 lg:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm">Gold Jewellery</p>
          <h2 className="font-serif text-2xl text-ink sm:text-4xl">Hallmarked gold designs for everyday and festive style.</h2>
          <a href="/gold-jewellery" className="mt-2 inline-block w-fit text-sm font-semibold text-gold-600 hover:underline">
            Explore Gold →
          </a>
        </div>
        <Image src={assets.goldBangles} alt="Gold jewellery" width={1200} height={800} sizes="(max-width: 640px) 100vw, 50vw" className="h-64 w-full object-cover sm:h-auto sm:max-h-[520px]" />
      </section>

      <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
        <SectionTitle kicker="New arrivals" title="Fresh pieces for a modern jewellery wardrobe." />
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} appState={appState} compact />
          ))}
        </div>
      </section>

      <section className="bg-gold-500 py-10 sm:py-14">
        <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-4 text-center text-white sm:gap-8 sm:px-5 lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">At the showroom</p>
            <h2 className="mt-2 font-serif text-3xl">Come in, try it on, take it home.</h2>
          </div>
          <ul className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-2">
            {offers.map((offer) => (
              <li key={offer}>{offer}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
        <SectionTitle kicker="Best sellers" title="Our most-asked-for pieces." />
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} appState={appState} compact />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-cream py-10">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-5 px-4 sm:grid-cols-3 sm:gap-6 sm:px-5 lg:grid-cols-6 lg:px-10">
          {trustItems.map((item) => (
            <div key={item} className="flex flex-col justify-start text-center">
              <strong className="block font-serif text-base leading-snug text-gold-600 sm:text-lg lg:text-base xl:text-lg">{item}</strong>
              <span className="text-xs text-muted">PS Jewellers assurance</span>
            </div>
          ))}
        </div>
      </section>

      {testimonials.length > 0 ? (
      <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
          <SectionTitle kicker="Customer testimonials" title="A luxury experience that feels trustworthy." />
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {testimonials.map((item) => (
              <article key={item.name} className="rounded-xs border border-line bg-white p-6">
                <p className="italic text-ink-soft">“{item.quote}”</p>
                <strong className="mt-3 block text-ink">{item.name}</strong>
                <span className="text-sm text-muted">{item.role}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {[assets.antiqueNecklace, assets.bridalJewellery, assets.diamondRing, assets.goldBangles, assets.earrings, assets.pendant].map((image, index) => (
          <Image key={image + index} src={image} alt="" width={400} height={400} sizes="(max-width: 640px) 33vw, 17vw" className="aspect-square w-full object-cover" />
        ))}
      </section>

      <section className="bg-ink py-12 sm:py-16">
        <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-4 text-center sm:px-5 lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-300">Store locator · Book appointment</p>
            <h2 className="mt-2 font-serif text-2xl leading-snug text-white sm:text-4xl">
              Visit PS Jewellers in Jhunjhunu or reserve a bridal styling consultation.
            </h2>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <a href="/store-locator" className="inline-flex min-h-12 items-center justify-center rounded-xs border border-white/60 px-6 text-sm font-semibold text-white hover:bg-white hover:text-ink">
              Find Store
            </a>
            <a href="/book-appointment" className="inline-flex min-h-12 items-center justify-center rounded-xs bg-gold-500 px-6 text-sm font-semibold text-white hover:bg-gold-600">
              Book Appointment
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-4 py-12 text-center sm:px-5 sm:py-16 lg:px-10">
        <SectionTitle kicker="Newsletter" title="Get collection previews and offer alerts." />
        <form onSubmit={(event) => event.preventDefault()} className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            aria-label="Email address"
            placeholder="Enter your email"
            className="min-h-12 w-full rounded-xs border border-line px-4 text-ink focus:border-gold-500 focus:outline-none sm:flex-1"
          />
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xs bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-gold-500">
            Subscribe
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-content px-4 pb-12 sm:px-5 sm:pb-16 lg:px-10">
        <SectionTitle kicker="Blog" title="Jewellery buying guides." />
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {blogPosts.map((post) => (
            <a href="/blog" key={post.title} className="rounded-xs border border-line bg-white p-4 transition-shadow hover:shadow-card">
              <Image src={post.image} alt="" width={640} height={360} sizes="(max-width: 640px) 100vw, 33vw" className="aspect-video w-full rounded-xs object-cover" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gold-600">{post.date}</p>
              <h3 className="mt-1 font-serif text-lg text-ink">{post.title}</h3>
            </a>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
