import { useEffect, useState, type FormEvent } from "react";
import type { AppState } from "../types";

interface HeaderProps {
  appState?: AppState;
}

const nav: [string, string][] = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["New In", "/new-arrivals"],
  ["Gold", "/gold-jewellery"],
  ["Diamond", "/diamond-jewellery"],
  ["Bridal", "/bridal-collection"],
  ["Offers", "/offers"],
  ["Store", "/store-locator"],
];

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <b className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold leading-none text-white">
      {count > 9 ? "9+" : count}
    </b>
  );
}

export default function Header({ appState }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const cartCount = appState?.cart?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const wishlistCount = appState?.wishlist?.length || 0;
  const closeMenu = () => setOpen(false);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = (appState?.searchTerm || "").trim();
    const target = query ? `/shop?search=${encodeURIComponent(query)}` : "/shop";
    closeMenu();
    window.location.href = target;
  };

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-5 lg:h-20 lg:gap-6 lg:px-10">
        <a
          className="font-serif text-lg font-semibold tracking-tight text-ink sm:text-xl"
          href="/"
          aria-label="PS Jewellers home"
        >
          PS <span className="text-gold-500">Jewellers</span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-7" aria-label="Primary navigation">
          {nav.map(([label, href]) => (
            <a
              key={`${label}-${href}`}
              href={href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-gold-600"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <form
            className="flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5 focus-within:border-gold-400"
            onSubmit={handleSearchSubmit}
          >
            <input
              value={appState?.searchTerm || ""}
              onChange={(event) => appState?.setSearchTerm(event.target.value)}
              placeholder="Search jewellery"
              aria-label="Search jewellery"
              className="w-40 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none xl:w-52"
            />
            <button type="submit" aria-label="Submit search" className="text-sm font-medium text-gold-600">
              Go
            </button>
          </form>
          <a href="/wishlist" aria-label="Wishlist" className="relative text-sm font-medium text-ink-soft hover:text-gold-600">
            Wishlist
            {wishlistCount ? (
              <b className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold text-white">
                {wishlistCount}
              </b>
            ) : null}
          </a>
          <a href="/cart" aria-label="Cart" className="relative text-sm font-medium text-ink-soft hover:text-gold-600">
            Cart
            {cartCount ? (
              <b className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-semibold text-white">
                {cartCount}
              </b>
            ) : null}
          </a>
          <a href="/account" aria-label="Account" className="text-sm font-medium text-ink-soft hover:text-gold-600">
            Account
          </a>
        </div>

        {/* Mobile quick actions: search, wishlist, cart always reachable without opening the menu */}
        <div className="flex items-center gap-1 lg:hidden">
          <a
            href="/shop"
            aria-label="Search jewellery"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-gold-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </a>
          <a
            href="/wishlist"
            aria-label={`Wishlist${wishlistCount ? ` (${wishlistCount} items)` : ""}`}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-gold-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
              <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" strokeLinejoin="round" />
            </svg>
            <CountBadge count={wishlistCount} />
          </a>
          <a
            href="/cart"
            aria-label={`Cart${cartCount ? ` (${cartCount} items)` : ""}`}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-gold-600"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
              <path d="M4 6h2l1.6 9.2a2 2 0 0 0 2 1.8h6.9a2 2 0 0 0 2-1.6L20 9H7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20" r="1.2" />
              <circle cx="17" cy="20" r="1.2" />
            </svg>
            <CountBadge count={cartCount} />
          </a>

          <button
            className="relative z-50 ml-1 flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-line bg-cream text-ink shadow-sm transition-colors hover:border-gold-500 hover:bg-gold-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
            type="button"
            aria-expanded={open}
            aria-label="Toggle navigation"
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            <span className={`block h-0.5 w-5 rounded-full bg-ink transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-ink transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 rounded-full bg-ink transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
        </div>
      </header>

      {/* Rendered outside <header>: the header's backdrop-blur creates a containing
          block, which would otherwise scope this fixed panel to the header box. */}
      <div
        id="mobile-navigation"
        className={`fixed inset-x-0 bottom-0 top-16 z-30 overscroll-contain bg-paper transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        // `inert` removes the subtree from the tab order and the accessibility
        // tree. Without it, opacity-0 links stay keyboard-focusable, and
        // aria-hidden on focusable content is itself an ARIA violation.
        inert={!open}
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6">
          <div className="flex items-baseline justify-between border-b border-line pb-4">
            <span className="font-serif text-lg text-ink">PS Jewellers</span>
            <small className="text-muted">Jhunjhunu, Rajasthan</small>
          </div>

          <form
            className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 focus-within:border-gold-400"
            onSubmit={handleSearchSubmit}
          >
            <input
              value={appState?.searchTerm || ""}
              onChange={(event) => appState?.setSearchTerm(event.target.value)}
              placeholder="Rings, bangles, bridal sets"
              aria-label="Search jewellery"
              className="w-full min-w-0 bg-transparent py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            <button type="submit" className="whitespace-nowrap text-sm font-medium text-gold-600">
              Search
            </button>
          </form>

          <nav className="flex flex-col" aria-label="Mobile navigation">
            {nav.map(([label, href]) => (
              <a
                key={`${label}-${href}`}
                href={href}
                onClick={closeMenu}
                className="flex min-h-12 items-center border-b border-line/70 text-base font-medium text-ink transition-colors hover:text-gold-600"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-5 text-sm font-medium text-ink-soft">
            <a href="/wishlist" onClick={closeMenu} className="flex min-h-11 items-center justify-center rounded-xs border border-line">
              Wishlist {wishlistCount ? `(${wishlistCount})` : ""}
            </a>
            <a href="/cart" onClick={closeMenu} className="flex min-h-11 items-center justify-center rounded-xs border border-line">
              Cart {cartCount ? `(${cartCount})` : ""}
            </a>
            <a href="/account" onClick={closeMenu} className="flex min-h-11 items-center justify-center rounded-xs border border-line">
              Account
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
