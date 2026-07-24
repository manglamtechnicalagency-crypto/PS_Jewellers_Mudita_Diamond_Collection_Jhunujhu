import { useEffect, useState, type FormEvent } from "react";
import type { AppState } from "../types";

interface HeaderProps {
  appState?: AppState;
}

const nav: [string, string][] = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Collections", "/shop"],
  ["Gold", "/gold-jewellery"],
  ["Diamond", "/diamond-jewellery"],
  ["Bridal", "/bridal-collection"],
  ["Offers", "/offers"],
  ["Store", "/store-locator"],
];

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
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between gap-6 px-5 py-4 lg:px-10">
        <a className="font-serif text-xl font-semibold tracking-tight text-ink" href="/" aria-label="PS Jewellers home">
          PS <span className="text-gold-500">Jewellers</span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
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
          <form className="flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5" onSubmit={handleSearchSubmit}>
            <input
              value={appState?.searchTerm || ""}
              onChange={(event) => appState?.setSearchTerm(event.target.value)}
              placeholder="Search jewellery"
              aria-label="Search jewellery"
              className="w-40 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
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

        <button
          className="flex flex-col gap-1.5 lg:hidden"
          type="button"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span className={`h-px w-5 bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-px w-5 bg-ink transition-transform ${open ? "-translate-y-0.5 -rotate-45" : ""}`} />
        </button>
      </div>

      <div
        className={`fixed inset-0 top-[65px] z-30 bg-paper transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col gap-8 overflow-y-auto px-6 py-8">
          <div className="flex items-baseline justify-between border-b border-line pb-4">
            <span className="font-serif text-lg text-ink">PS Jewellers</span>
            <small className="text-muted">Bikaner, Rajasthan</small>
          </div>

          <form className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2" onSubmit={handleSearchSubmit}>
            <input
              value={appState?.searchTerm || ""}
              onChange={(event) => appState?.setSearchTerm(event.target.value)}
              placeholder="Rings, bangles, bridal sets"
              aria-label="Search jewellery"
              className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
            />
            <button type="submit" className="whitespace-nowrap text-sm font-medium text-gold-600">
              Search
            </button>
          </form>

          <nav className="flex flex-col gap-4" aria-label="Mobile navigation">
            {nav.map(([label, href]) => (
              <a key={`${label}-${href}`} href={href} onClick={closeMenu} className="text-lg font-medium text-ink">
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-auto flex items-center gap-6 border-t border-line pt-6 text-sm font-medium text-ink-soft">
            <a href="/wishlist" onClick={closeMenu}>
              Wishlist {wishlistCount ? `(${wishlistCount})` : ""}
            </a>
            <a href="/cart" onClick={closeMenu}>
              Cart {cartCount ? `(${cartCount})` : ""}
            </a>
            <a href="/account" onClick={closeMenu}>
              Account
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
