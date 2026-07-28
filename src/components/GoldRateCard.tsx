export default function GoldRateCard() {
  return <section className="border-y border-gold-200 bg-ink py-12 text-white sm:py-16" aria-labelledby="gold-rate-heading">
    <div className="mx-auto grid max-w-content gap-8 px-4 sm:px-5 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
      <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-300">Live showroom guidance</p><h2 id="gold-rate-heading" className="mt-3 font-serif text-3xl sm:text-4xl">Today&apos;s Gold Rate</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Rates are updated daily. Contact us on WhatsApp for live pricing, making charges and personalised guidance.</p></div>
      <div className="grid grid-cols-3 divide-x divide-white/15 rounded-xl border border-white/15 bg-white/5"><div className="px-5 py-4 text-center"><span className="block text-xs uppercase tracking-[0.16em] text-white/60">22K</span><strong className="mt-2 block font-serif text-xl text-gold-200">Live</strong></div><div className="px-5 py-4 text-center"><span className="block text-xs uppercase tracking-[0.16em] text-white/60">24K</span><strong className="mt-2 block font-serif text-xl text-gold-200">Live</strong></div><div className="px-5 py-4 text-center"><span className="block text-xs uppercase tracking-[0.16em] text-white/60">Silver</span><strong className="mt-2 block font-serif text-xl text-gold-200">Live</strong></div></div>
    </div>
  </section>;
}
