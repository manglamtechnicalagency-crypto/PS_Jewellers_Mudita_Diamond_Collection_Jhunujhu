export default function Footer() {
  return (
    <footer className="border-t border-line bg-cream">
      <div className="mx-auto max-w-content px-5 py-16 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-line pb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-600">PS Jewellers</p>
            <h2 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">Luxury you can trust.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="rounded-xs bg-ink px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gold-500 hover:text-ink"
              href="/book-appointment"
            >
              Book Appointment
            </a>
            <a
              className="rounded-xs border border-gold-500 px-6 py-3 text-sm font-medium text-gold-600 transition-colors hover:bg-gold-500 hover:text-white"
              href="/shop"
            >
              Shop Jewellery
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Shop</p>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/gold-jewellery">Gold Jewellery</a>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/diamond-jewellery">Diamond Jewellery</a>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/bridal-collection">Bridal Collection</a>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/offers">Offers</a>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Support</p>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/store-locator">Store Locator</a>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/order-tracking">Order Tracking</a>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/faq">FAQ</a>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/return-policy">Return Policy</a>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Visit</p>
            <p className="text-sm text-ink-soft">
              Bikaner, Rajasthan
              <br />
              Premium jewellery showroom
            </p>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="mailto:care@vedantjewellers.com">
              care@vedantjewellers.com
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 PS Jewellers. Demo website.</span>
          <span className="flex gap-3">
            <a className="hover:text-gold-600" href="/privacy-policy">Privacy</a>
            <span aria-hidden="true">·</span>
            <a className="hover:text-gold-600" href="/terms">Terms</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
