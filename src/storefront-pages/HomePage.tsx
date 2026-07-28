import Image from "next/image";
import SiteLayout from "../components/SiteLayout";
import ProductCard from "../components/ProductCard";
import WhatsAppButton from "../components/WhatsAppButton";
import GoldRateCard from "../components/GoldRateCard";
import { assets, collections, testimonials, trustItems } from "../data";
import type { AppState, HomepageSettings, Product } from "../types";

interface HomePageProps { appState?: AppState; settings: HomepageSettings; products: Product[]; }

function SectionTitle({ eyebrow, title, copy, dark = false }: { eyebrow: string; title: string; copy?: string; dark?: boolean }) {
  return <div className="max-w-2xl"><p className={`text-xs font-semibold uppercase tracking-[0.24em] ${dark ? "text-gold-300" : "text-gold-600"}`}>{eyebrow}</p><h2 className={`mt-3 font-serif text-3xl leading-tight sm:text-4xl ${dark ? "text-white" : "text-ink"}`}>{title}</h2>{copy ? <p className={`mt-3 text-sm leading-6 sm:text-base ${dark ? "text-white/70" : "text-ink-soft"}`}>{copy}</p> : null}</div>;
}

export default function HomePage({ appState, settings, products }: HomePageProps) {
  const featured = products.slice(0, 4);
  const newArrivals = products.filter((product) => ["New Arrival", "New", "Minimal"].includes(product.badge)).slice(0, 4);
  const bestSellers = products.filter((product) => ["Best Seller", "Popular", "Loved", "Premium"].includes(product.badge)).slice(0, 4);
  const gallery = products.slice(0, 6);
  const heroProduct = products.find((product) => product.badge === "Best Seller") ?? products[0];

  return <SiteLayout appState={appState}>
    <section className="relative flex min-h-[78svh] items-end overflow-hidden bg-ink sm:min-h-[86vh]">
      <video src={assets.heroVideo} poster={assets.antiqueNecklace} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-65" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-transparent" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-content px-4 pb-14 pt-32 sm:px-5 sm:pb-20 lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-300 sm:text-sm">{settings.heroEyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.06] text-white sm:text-6xl lg:text-7xl">{settings.heroTitle}</h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{settings.heroDescription}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><a href="/shop" className="inline-flex min-h-13 items-center justify-center rounded-lg bg-gold-500 px-7 text-sm font-semibold text-white transition hover:bg-gold-600">Explore the catalogue</a><WhatsAppButton product={heroProduct} label="Ask today&apos;s price" className="min-h-13 border-white/60 bg-white/10 px-7 text-white hover:bg-white/15" variant="ghost" /></div>
      </div>
    </section>

    <section className="mx-auto max-w-content px-4 py-14 sm:px-5 sm:py-20 lg:px-10"><SectionTitle eyebrow="Curated collections" title="Find the piece that feels like you." copy="Gold, diamonds, bridal heirlooms and silver, curated for the moments you will remember." /><div className="mt-9 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-5">{collections.map((collection) => <a key={collection.title} href="/shop" className="group overflow-hidden rounded-xl border border-line bg-white shadow-card transition hover:-translate-y-1 hover:shadow-elevated"><div className="relative aspect-[4/3] overflow-hidden"><Image src={collection.image} alt={collection.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 240px" className="object-cover transition duration-700 group-hover:scale-105" /></div><div className="p-4"><h3 className="font-serif text-xl text-ink">{collection.title}</h3><p className="mt-1 text-sm leading-5 text-ink-soft">{collection.copy}</p></div></a>)}</div></section>

    <section className="bg-cream py-14 sm:py-20"><div className="mx-auto max-w-content px-4 sm:px-5 lg:px-10"><div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><SectionTitle eyebrow="Featured jewellery" title="Beautifully made. Worth asking about." copy="Every piece is photographed, described and ready for a private price conversation." /><a href="/shop" className="shrink-0 text-sm font-semibold text-gold-700 hover:underline">View all jewellery ↗</a></div><div className="mt-9 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{featured.map((product) => <ProductCard key={product.id} product={product} appState={appState} />)}</div></div></section>

    <section className="grid sm:grid-cols-2"><div className="flex flex-col justify-center bg-ink px-5 py-14 sm:p-12 lg:p-20"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-300">Made for milestones</p><h2 className="mt-4 font-serif text-3xl leading-tight text-white sm:text-5xl">Your occasion deserves a little more time.</h2><p className="mt-4 max-w-md text-sm leading-6 text-white/70">Visit our Jhunjhunu showroom for private bridal styling, custom jewellery and one-to-one diamond guidance.</p><a href="/book-appointment" className="mt-7 inline-flex min-h-12 w-fit items-center rounded-lg border border-gold-300 px-6 text-sm font-semibold text-gold-200 hover:bg-gold-500 hover:text-white">Book a showroom visit</a></div><Image src={assets.goldBangles} alt="Gold bangles at PS Jewellers" width={1200} height={900} sizes="(max-width: 640px) 100vw, 50vw" className="h-full min-h-80 w-full object-cover" /></section>

    <section className="mx-auto max-w-content px-4 py-14 sm:px-5 sm:py-20 lg:px-10"><div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><SectionTitle eyebrow="New arrivals" title="Fresh pieces for a modern jewellery wardrobe." /><a href="/new-arrivals" className="shrink-0 text-sm font-semibold text-gold-700 hover:underline">See new arrivals ↗</a></div><div className="mt-9 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{newArrivals.map((product) => <ProductCard key={product.id} product={product} appState={appState} compact />)}</div></section>

    <GoldRateCard />

    <section className="mx-auto max-w-content px-4 py-14 sm:px-5 sm:py-20 lg:px-10"><div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><SectionTitle eyebrow="Best sellers" title="Pieces our showroom team loves to show." copy="Start with a conversation and we will share today's price, availability and more views." /><a href="/shop" className="shrink-0 text-sm font-semibold text-gold-700 hover:underline">Explore best sellers ↗</a></div><div className="mt-9 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{bestSellers.map((product) => <ProductCard key={product.id} product={product} appState={appState} compact />)}</div></section>

    <section className="border-y border-line bg-cream py-14 sm:py-20"><div className="mx-auto max-w-content px-4 sm:px-5 lg:px-10"><SectionTitle eyebrow="Why PS Jewellers" title="A more personal way to choose jewellery." /><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{trustItems.slice(0, 8).map((item) => <div key={item} className="rounded-xl border border-gold-100 bg-white p-5 shadow-card"><span className="text-2xl text-gold-500" aria-hidden="true">✦</span><h3 className="mt-5 font-serif text-xl text-ink">{item}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">Thoughtful guidance from first question to showroom visit.</p></div>)}</div></div></section>

    {testimonials.length ? <section className="mx-auto max-w-content px-4 py-14 sm:px-5 sm:py-20 lg:px-10"><SectionTitle eyebrow="Customer stories" title="Chosen for the moments that matter." /><div className="mt-9 grid gap-5 sm:grid-cols-3">{testimonials.map((testimonial) => <article key={testimonial.name} className="rounded-xl border border-line bg-white p-6 shadow-card"><div className="text-gold-500" aria-label="5 star review">★★★★★</div><p className="mt-4 font-serif text-xl leading-7 text-ink">“{testimonial.quote}”</p><p className="mt-5 text-sm font-semibold text-ink">{testimonial.name}</p><p className="text-xs text-muted">{testimonial.role}</p></article>)}</div></section> : null}

    <section className="mx-auto max-w-content px-4 py-14 sm:px-5 sm:py-20 lg:px-10"><div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><SectionTitle eyebrow="From our studio" title="See the details up close." copy="Follow the latest pieces, styling ideas and showroom moments on Instagram." /><a href="https://instagram.com" className="shrink-0 text-sm font-semibold text-gold-700 hover:underline">Follow @psjewellers ↗</a></div><div className="mt-9 grid grid-cols-3 gap-2 sm:gap-4">{gallery.map((product) => <a key={product.id} href={`/product/${product.slug}`} className="group relative aspect-square overflow-hidden rounded-lg"><Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 33vw, 240px" className="object-cover transition duration-700 group-hover:scale-105" /><span className="absolute inset-x-2 bottom-2 truncate rounded bg-ink/75 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">{product.name}</span></a>)}</div></section>

    <section className="border-t border-line bg-cream py-14 sm:py-20"><div className="mx-auto grid max-w-content gap-8 px-4 sm:px-5 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-10"><div><SectionTitle eyebrow="Visit PS Jewellers" title="Come see what the camera cannot capture." copy="Oriental Tower Road No. 1, Shop No. 1, Jhunjhunu, Rajasthan. Open daily for private consultations." /><div className="mt-6 flex flex-wrap gap-3"><a href="/book-appointment" className="inline-flex min-h-12 items-center rounded-lg bg-ink px-6 text-sm font-semibold text-white hover:bg-gold-600">Book an appointment</a><a href="tel:+919829407255" className="inline-flex min-h-12 items-center rounded-lg border border-line bg-white px-6 text-sm font-semibold text-ink-soft hover:border-gold-500 hover:text-gold-600">Call showroom</a></div></div><a href="https://maps.google.com/?q=PS+Jewellers+Jhunjhunu" className="flex min-h-64 items-center justify-center rounded-2xl border border-gold-200 bg-[radial-gradient(circle_at_center,rgba(193,145,43,0.2),transparent_55%)] p-8 text-center shadow-card"><span><span className="block text-4xl" aria-hidden="true">⌖</span><strong className="mt-3 block font-serif text-2xl text-ink">Jhunjhunu showroom</strong><span className="mt-1 block text-sm text-ink-soft">Open Google Maps ↗</span></span></a></div></section>
  </SiteLayout>;
}
