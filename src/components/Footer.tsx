import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-cream">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-5 sm:py-16 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-line pb-10 sm:pb-12">
          <div>
            <BrandLogo className="h-20 w-20" />
            <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl lg:text-5xl">Luxury you can trust.</h2>
          </div>
        </div>

        <div className="grid gap-8 py-10 sm:grid-cols-3 sm:gap-10 sm:py-12">
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
            <a className="text-sm text-ink-soft hover:text-gold-600" href="/faq">FAQ</a>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Visit</p>
            <address className="not-italic text-sm leading-6 text-ink-soft">
              Oriental Tower Road No. 1, Shop No. 1
              <br />
              Jhunjhunu, Rajasthan
            </address>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="https://wa.me/919829407255">
              WhatsApp: 9829407255
            </a>
            <a className="text-sm text-ink-soft hover:text-gold-600" href="mailto:subhashsoni334@gmail.com">
              subhashsoni334@gmail.com
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 PS Jewellers. Developed by Manglam Technical Agency.</span>
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
