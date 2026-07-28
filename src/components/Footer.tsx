import WhatsAppButton from "./WhatsAppButton";

export default function Footer() {
  return <footer className="border-t border-line bg-cream">
    <div className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
      <div className="flex flex-col gap-6 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between sm:pb-12">
        <div><p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-600">PS Jewellers · Jhunjhunu</p><h2 className="mt-2 max-w-xl font-serif text-3xl text-ink sm:text-4xl lg:text-5xl">Jewellery worth asking about.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-ink-soft">Private guidance, certified craftsmanship and a showroom experience made around your occasion.</p></div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2"><a className="inline-flex min-h-12 items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-gold-500" href="/book-appointment">Book Appointment</a><WhatsAppButton label="WhatsApp Expert" className="min-h-12" /></div>
      </div>
      <div className="grid gap-8 py-10 sm:grid-cols-3 sm:gap-10 sm:py-12">
        <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Collections</p><a className="text-sm text-ink-soft hover:text-gold-600" href="/gold-jewellery">Gold Jewellery</a><a className="text-sm text-ink-soft hover:text-gold-600" href="/diamond-jewellery">Diamond Jewellery</a><a className="text-sm text-ink-soft hover:text-gold-600" href="/bridal-collection">Bridal Collection</a><a className="text-sm text-ink-soft hover:text-gold-600" href="/silver-jewellery">Silver Collection</a></div>
        <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Quick links</p><a className="text-sm text-ink-soft hover:text-gold-600" href="/new-arrivals">New Arrivals</a><a className="text-sm text-ink-soft hover:text-gold-600" href="/offers">Offers</a><a className="text-sm text-ink-soft hover:text-gold-600" href="/gold-rate">Today&apos;s Gold Rate</a><a className="text-sm text-ink-soft hover:text-gold-600" href="/about">About PS Jewellers</a></div>
        <div className="flex flex-col gap-3"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Visit the showroom</p><address className="not-italic text-sm leading-6 text-ink-soft">Oriental Tower Road No. 1, Shop No. 1<br />Jhunjhunu, Rajasthan</address><a className="text-sm text-ink-soft hover:text-gold-600" href="tel:+919829407255">+91 98294 07255</a><a className="text-sm text-ink-soft hover:text-gold-600" href="mailto:subhashsoni334@gmail.com">subhashsoni334@gmail.com</a><a className="text-sm text-ink-soft hover:text-gold-600" href="https://maps.google.com/?q=PS+Jewellers+Jhunjhunu">Open in Google Maps ↗</a></div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"><span>© 2026 PS Jewellers. Developed by Manglam Technical Agency.</span><span className="flex gap-3"><a className="hover:text-gold-600" href="/privacy-policy">Privacy</a><span aria-hidden="true">·</span><a className="hover:text-gold-600" href="/terms">Terms</a></span></div>
    </div>
  </footer>;
}
