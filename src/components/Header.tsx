import { useEffect, useState, type FormEvent } from "react";
import type { AppState } from "../types";
import BrandLogo from "./BrandLogo";
import { NAV_LINKS } from "../lib/storefront-routes";

interface HeaderProps { appState?: AppState; }

// Derived from the shared route table so a nav entry cannot point at a path the
// router does not handle. Three of these (New In, Bridal, Offers) were dead
// links returning a 404 body at HTTP 200.
const nav = NAV_LINKS;

export default function Header({ appState }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = (appState?.searchTerm || "").trim();
    closeMenu();
    window.location.href = query ? `/shop?search=${encodeURIComponent(query)}` : "/shop";
  };

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  return <>
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-5 lg:h-20 lg:gap-6 lg:px-10">
        <a className="flex shrink-0 items-center" href="/" aria-label="PS Jewellers — Mudita Diamonds, home"><BrandLogo className="h-14 w-auto sm:h-16" priority /></a>
        <nav className="hidden items-center gap-6 lg:flex xl:gap-7" aria-label="Primary navigation">
          {nav.map(([label, href]) => <a key={`${label}-${href}`} href={href} className="text-sm font-medium text-ink-soft transition-colors hover:text-gold-600">{label}</a>)}
        </nav>
        <div className="hidden items-center gap-5 lg:flex">
          <form className="flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5 focus-within:border-gold-400" onSubmit={handleSearchSubmit}>
            <input value={appState?.searchTerm || ""} onChange={(event) => appState?.setSearchTerm(event.target.value)} placeholder="Search jewellery" aria-label="Search jewellery" className="w-40 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none xl:w-52" />
            <button type="submit" aria-label="Submit search" className="text-sm font-medium text-gold-600">Go</button>
          </form>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <a href="/shop" aria-label="Search jewellery" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-gold-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          </a>
          <button className="relative z-50 ml-1 flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-line bg-cream text-ink shadow-sm transition-colors hover:border-gold-500 hover:bg-gold-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2" type="button" aria-expanded={open} aria-label="Toggle navigation" aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>
            <span className={`block h-0.5 w-5 rounded-full bg-ink transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`} /><span className={`block h-0.5 w-5 rounded-full bg-ink transition-opacity duration-200 ${open ? "opacity-0" : ""}`} /><span className={`block h-0.5 w-5 rounded-full bg-ink transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>
    </header>
    <div id="mobile-navigation" className={`fixed inset-x-0 bottom-0 top-16 z-30 overscroll-contain bg-paper transition-opacity duration-200 lg:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!open} inert={!open}>
        <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6">
        <div className="flex items-center justify-between border-b border-line pb-4"><BrandLogo className="h-16 w-16" /><small className="text-muted">Jhunjhunu, Rajasthan</small></div>
        <form className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 focus-within:border-gold-400" onSubmit={handleSearchSubmit}><input value={appState?.searchTerm || ""} onChange={(event) => appState?.setSearchTerm(event.target.value)} placeholder="Rings, bangles, bridal sets" aria-label="Search jewellery" className="w-full min-w-0 bg-transparent py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none" /><button type="submit" className="whitespace-nowrap text-sm font-medium text-gold-600">Search</button></form>
        <nav className="flex flex-col" aria-label="Mobile navigation">{nav.map(([label, href]) => <a key={`${label}-${href}`} href={href} onClick={closeMenu} className="flex min-h-12 items-center border-b border-line/70 text-base font-medium text-ink transition-colors hover:text-gold-600">{label}</a>)}</nav>
        <div className="mt-auto border-t border-line pt-5 text-sm font-medium text-ink-soft" />
      </div>
    </div>
  </>;
}
