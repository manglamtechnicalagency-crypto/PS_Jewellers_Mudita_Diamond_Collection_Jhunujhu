import type { ReactNode } from "react";
import SiteLayout from "../components/SiteLayout";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { assets, blogPosts, categories, categoryToPath, collections, formatPrice, offers, products, testimonials, trustItems } from "../data";
import type { AppState } from "../types";

interface HomePageProps {
  appState?: AppState;
}

function SectionTitle({ kicker, title, copy }: { kicker: string; title: string; copy?: ReactNode }) {
  return (
    <div className="mb-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">{kicker}</p>
      <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">{title}</h2>
      {copy ? <span className="mt-2 block text-ink-soft">{copy}</span> : null}
    </div>
  );
}

export default function HomePage({ appState }: HomePageProps) {
  const featured = products.slice(0, 8);
  const bestSellers = products.filter((product) => ["Best Seller", "Popular", "Premium", "Loved"].includes(product.badge)).slice(0, 4);
  const newArrivals = products.filter((product) => ["New Arrival", "New", "Minimal"].includes(product.badge)).slice(0, 4);

  return (
    <SiteLayout appState={appState}>
      <section className="relative flex min-h-[85vh] items-center overflow-hidden bg-ink">
        <video src={assets.heroVideo} poster={assets.antiqueNecklace} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-content flex-col gap-6 px-5 py-24 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-300">PS Jewellers · Bikaner</p>
          <h1 className="max-w-2xl font-serif text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            Luxury jewellery crafted for life's finest occasions.
          </h1>
          <p className="max-w-xl text-white/80">
            Explore BIS hallmarked gold, certified diamonds, bridal heirlooms and modern everyday pieces in a premium ecommerce demo.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <a href="/shop" className="rounded-xs bg-gold-500 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gold-600">
              Shop Collection
            </a>
            <a href="/book-appointment" className="rounded-xs border border-white/60 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-ink">
              Book Appointment
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 hidden rounded-xs bg-white/95 p-5 shadow-elevated sm:block">
          <strong className="block font-serif text-3xl text-gold-600">{formatPrice(249000)}</strong>
          <span className="text-sm text-ink">Royal Antique Necklace</span>
          <p className="mt-1 text-xs text-muted">BIS Hallmarked · 22K Gold · Wedding Collection</p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <SectionTitle kicker="Featured collections" title="Curated for every celebration." copy="Luxury categories built for showroom browsing and ecommerce demos." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((collection) => (
            <Reveal key={collection.title}>
              <a href="/shop" className="group block overflow-hidden rounded-xs border border-line bg-white shadow-card">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={collection.image} alt={collection.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
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

      <section className="bg-ink py-16">
        <div className="mx-auto max-w-content px-5 lg:px-10">
          <SectionTitle kicker="Shop by category" title="Gold, diamonds, bridal and everyday luxury." />
        </div>
        <div className="mx-auto flex max-w-content flex-wrap justify-center gap-3 px-5 lg:px-10">
          {categories.map((category) => (
            <a
              key={category}
              href={categoryToPath[category] ?? "/shop"}
              className="rounded-full border border-gold-500/50 px-5 py-2 text-sm text-gold-300 transition-colors hover:bg-gold-500 hover:text-white"
            >
              {category}
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <SectionTitle
          kicker="Featured products"
          title="New arrivals, best sellers and trending jewellery."
          copy="Every product includes demo pricing, hallmarking, specs, reviews and shopping actions."
        />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} appState={appState} />
          ))}
        </div>
      </section>

      <section className="grid gap-1 sm:grid-cols-2">
        <div className="flex flex-col justify-center gap-3 bg-cream p-10 lg:p-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Gold Jewellery</p>
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">Hallmarked gold designs for everyday and festive style.</h2>
          <a href="/gold-jewellery" className="mt-2 inline-block w-fit text-sm font-semibold text-gold-600 hover:underline">
            Explore Gold →
          </a>
        </div>
        <img src={assets.goldBangles} alt="Gold jewellery" className="h-64 w-full object-cover sm:h-auto" />
      </section>

      <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <SectionTitle kicker="New arrivals" title="Fresh pieces for a modern jewellery wardrobe." />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} appState={appState} compact />
          ))}
        </div>
      </section>

      <section className="bg-gold-500 py-14">
        <div className="mx-auto flex max-w-content flex-col items-center gap-8 px-5 text-center text-white lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Limited time demo offers</p>
            <h2 className="mt-2 font-serif text-3xl">Premium retail moments built for client presentations.</h2>
          </div>
          <ul className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-8">
            {offers.map((offer) => (
              <li key={offer}>{offer}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <SectionTitle kicker="Best sellers" title="Loved by demo shoppers." />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} appState={appState} compact />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-cream py-10">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-6 px-5 sm:grid-cols-4 lg:px-10">
          {trustItems.map((item) => (
            <div key={item} className="text-center">
              <strong className="block font-serif text-lg text-gold-600">{item}</strong>
              <span className="text-xs text-muted">PS Jewellers demo assurance</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <SectionTitle kicker="Customer testimonials" title="A luxury experience that feels trustworthy." />
        <div className="grid gap-6 sm:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="rounded-xs border border-line bg-white p-6">
              <p className="italic text-ink-soft">“{item.quote}”</p>
              <strong className="mt-3 block text-ink">{item.name}</strong>
              <span className="text-sm text-muted">{item.role}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {[assets.antiqueNecklace, assets.bridalJewellery, assets.diamondRing, assets.goldBangles, assets.earrings, assets.pendant].map((image, index) => (
          <img key={image + index} src={image} alt="Instagram jewellery gallery" className="aspect-square w-full object-cover" />
        ))}
      </section>

      <section className="bg-ink py-16">
        <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-5 text-center lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-300">Store locator · Book appointment</p>
            <h2 className="mt-2 font-serif text-3xl text-white sm:text-4xl">
              Visit PS Jewellers in Bikaner or reserve a bridal styling consultation.
            </h2>
          </div>
          <div className="flex gap-4">
            <a href="/store-locator" className="rounded-xs border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:bg-white hover:text-ink">
              Find Store
            </a>
            <a href="/book-appointment" className="rounded-xs bg-gold-500 px-6 py-3 text-sm font-semibold text-white hover:bg-gold-600">
              Book Appointment
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 text-center lg:px-10">
        <SectionTitle kicker="Newsletter" title="Get collection previews and offer alerts." />
        <form onSubmit={(event) => event.preventDefault()} className="mx-auto flex max-w-md gap-2">
          <input
            type="email"
            required
            aria-label="Email address"
            placeholder="Enter your email"
            className="flex-1 rounded-xs border border-line px-4 py-3 text-ink focus:border-gold-500 focus:outline-none"
          />
          <button type="submit" className="rounded-xs bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-gold-500">
            Subscribe
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-content px-5 pb-16 lg:px-10">
        <SectionTitle kicker="Blog" title="Jewellery buying guides." />
        <div className="grid gap-6 sm:grid-cols-3">
          {blogPosts.map((post) => (
            <a href="/blog" key={post.title} className="rounded-xs border border-line bg-white p-4">
              <img src={post.image} alt="" className="aspect-video w-full rounded-xs object-cover" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gold-600">{post.date}</p>
              <h3 className="mt-1 font-serif text-lg text-ink">{post.title}</h3>
            </a>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
