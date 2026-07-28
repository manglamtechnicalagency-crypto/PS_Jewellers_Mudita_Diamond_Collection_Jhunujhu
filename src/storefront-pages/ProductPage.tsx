"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import SiteLayout from "../components/SiteLayout";
import ProductCard from "../components/ProductCard";
import WhatsAppButton from "../components/WhatsAppButton";
import { categoryToPath, products, trustItems } from "../data";
import type { AppState, Product } from "../types";

interface ProductPageProps { product: Product; appState?: AppState; }

export default function ProductPage({ product, appState }: ProductPageProps) {
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const related = useMemo(() => products.filter((item) => item.id !== product.id && (item.category === product.category || item.collection === product.collection)).slice(0, 4), [product]);

  useEffect(() => {
    appState?.addRecentlyViewed(product);
    setActiveImage(product.images[0]);
    document.title = `${product.name} | PS Jewellers`;
  }, [product, appState]);

  const specRows: [string, string][] = [["Category", product.category], ["Metal & Purity", product.purity], ["Weight", product.weight], ["Availability", product.availability], ["Hallmark", product.hallmark], ["Certification", product.certification], ["SKU", product.sku], ["Occasion", product.occasion]];

  return <SiteLayout appState={appState}>
    <section className="mx-auto max-w-content px-4 py-6 sm:px-5 sm:py-8 lg:px-10 lg:py-14">
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted sm:mb-8 sm:text-sm" aria-label="Breadcrumb"><a href="/" className="hover:text-gold-600">Home</a><span aria-hidden="true">›</span><a href={categoryToPath[product.category] ?? "/shop"} className="hover:text-gold-600">{product.category}</a><span aria-hidden="true">›</span><span className="font-medium text-gold-600">{product.name}</span></nav>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        <div><div className="relative aspect-square overflow-hidden rounded-2xl bg-cream"><Image src={activeImage} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" /></div><div className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:gap-3">{product.images.map((image, index) => <button key={image} type="button" onClick={() => setActiveImage(image)} aria-label={`View image ${index + 1} of ${product.name}`} aria-pressed={activeImage === image} className={`relative aspect-square overflow-hidden rounded-lg border transition ${activeImage === image ? "border-gold-500" : "border-line hover:border-gold-300"}`}><Image src={image} alt="" fill sizes="120px" className="object-cover" /></button>)}</div><p className="mt-3 text-xs text-muted">Gallery · Zoom-ready photography · More photos available on WhatsApp</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 sm:text-sm">{product.collection}</p><h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">{product.name}</h1><div className="my-5 h-px w-16 bg-gold-500" aria-hidden="true" /><p className="text-sm italic leading-6 text-ink-soft sm:text-base">“{product.description}”</p><div className="mt-6 flex flex-wrap items-center gap-3"><strong className="font-serif text-3xl text-gold-600 sm:text-4xl">Today&apos;s Price on Request</strong><span className="rounded-full bg-gold-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-700">Luxury gold</span></div><p className="mt-2 text-sm text-muted">Ask today&apos;s rate, making charges, availability and more photos directly from our showroom team.</p>
          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">{specRows.map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 py-3"><dt className="font-medium text-ink-soft">{label}</dt><dd className="text-right text-ink">{value}</dd></div>)}</dl>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap"><WhatsAppButton product={product} label="Get Live Price on WhatsApp" className="min-h-13 px-7" /><a href="tel:+919829407255" className="inline-flex min-h-13 items-center justify-center rounded-lg border border-gold-500 px-6 text-sm font-semibold text-gold-700 transition hover:bg-gold-50">📞 Call Jewellery Expert</a><a href="/book-appointment" className="inline-flex min-h-13 items-center justify-center rounded-lg border border-line px-6 text-sm font-medium text-ink-soft transition hover:border-gold-500 hover:text-gold-600">📅 Book Showroom Appointment</a><button type="button" onClick={() => appState?.toggleWishlist(product)} className="inline-flex min-h-13 items-center justify-center rounded-lg border border-line px-6 text-sm font-medium text-ink-soft transition hover:border-gold-500 hover:text-gold-600">{appState?.wishlist?.includes(product.id) ? "Wishlisted ♡" : "Save to wishlist ♡"}</button></div>
          <p className="mt-5 text-xs leading-5 text-muted">Your expert will share the live gold rate, making charges, hallmark details, availability, delivery information and customisation options.</p>
        </div>
      </div>
    </section>
    <section className="bg-cream py-12 sm:py-16"><div className="mx-auto max-w-content px-4 sm:px-5 lg:px-10"><h2 className="font-serif text-2xl text-ink sm:text-3xl">Crafted for your occasion</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft sm:text-base">{product.description}</p><ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{product.highlights.map((item) => <li key={item} className="rounded-lg border border-gold-100 bg-white p-4 text-sm text-ink-soft"><span className="mr-2 text-gold-500" aria-hidden="true">✦</span>{item}</li>)}</ul></div></section>
    <section className="border-y border-line py-10"><div className="mx-auto grid max-w-content grid-cols-2 gap-5 px-4 sm:grid-cols-4 sm:gap-6 sm:px-5 lg:px-10">{trustItems.slice(0, 8).map((item) => <div key={item} className="text-center"><strong className="block font-serif text-base leading-snug text-gold-600 sm:text-lg">{item}</strong><span className="text-xs text-muted">PS Jewellers assurance</span></div>)}</div></section>
    {related.length ? <section className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10"><h2 className="font-serif text-2xl text-ink sm:text-3xl">You may also like</h2><div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} appState={appState} compact />)}</div></section> : null}
  </SiteLayout>;
}
