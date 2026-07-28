"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AppState } from "../types";
import WhatsAppButton from "./WhatsAppButton";

interface HeaderProps { appState?: AppState; }

const nav: [string, string][] = [
  ["Home", "/"],
  ["Gold Jewellery", "/gold-jewellery"],
  ["Diamond", "/diamond-jewellery"],
  ["Bridal", "/bridal-collection"],
  ["Silver", "/silver-jewellery"],
  ["New Arrivals", "/new-arrivals"],
  ["Offers", "/offers"],
  ["Gold Rate", "/gold-rate"],
  ["About", "/about"],
  ["Contact", "/contact"],
];

export default function Header({ appState }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = (appState?.searchTerm || "").trim();
    window.location.href = query ? `/shop?search=${encodeURIComponent(query)}` : "/shop";
  };

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", open);
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  return <>
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-5 lg:min-h-20 lg:gap-6 lg:px-10">
        <a className="shrink-0 font-serif text-lg font-semibold tracking-tight text-ink sm:text-xl" href="/" aria-label="PS Jewellers home">PS <span className="text-gold-500">Jewellers</span></a>
        <nav className="hidden items-center gap-5 lg:flex xl:gap-6" aria-label="Primary navigation">{nav.map(([label, href]) => <a key={href} href={href} className="text-[13px] font-medium text-ink-soft transition-colors hover:text-gold-600">{label}</a>)}</nav>
        <div className="hidden items-center gap-3 lg:flex">
          <form className="flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5 focus-within:border-gold-400" onSubmit={handleSearchSubmit}><input value={appState?.searchTerm || ""} onChange={(event) => appState?.setSearchTerm(event.target.value)} placeholder="Search jewellery" aria-label="Search jewellery" className="w-36 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none xl:w-44" /><button type="submit" aria-label="Submit search" className="text-sm font-medium text-gold-600">Go</button></form>
          <a href="/book-appointment" className="inline-flex min-h-10 items-center rounded-lg border border-gold-500 px-4 text-xs font-semibold text-gold-700 transition hover:bg-gold-50">Book Appointment</a>
          <WhatsAppButton label="WhatsApp" className="min-h-10 rounded-lg px-4 text-xs" />
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <a href="/shop" aria-label="Search jewellery" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-cream hover:text-gold-600"><span aria-hidden="true" className="text-lg">⌕</span></a>
          <button type="button" className="relative z-50 ml-1 flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full border border-line bg-cream text-ink" aria-expanded={open} aria-label="Toggle navigation" aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}><span className={`block h-0.5 w-5 rounded-full bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} /><span className={`block h-0.5 w-5 rounded-full bg-ink transition-opacity ${open ? "opacity-0" : ""}`} /><span className={`block h-0.5 w-5 rounded-full bg-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} /></button>
        </div>
      </div>
    </header>
    <div id="mobile-navigation" className={`fixed inset-x-0 bottom-0 top-16 z-30 overscroll-contain bg-paper transition-opacity lg:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!open} inert={!open}>
      <div className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6">
        <div className="flex items-baseline justify-between border-b border-line pb-4"><span className="font-serif text-lg text-ink">PS Jewellers</span><small className="text-muted">Jhunjhunu, Rajasthan</small></div>
        <form className="flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2" onSubmit={handleSearchSubmit}><input value={appState?.searchTerm || ""} onChange={(event) => appState?.setSearchTerm(event.target.value)} placeholder="Rings, bangles, bridal sets" aria-label="Search jewellery" className="w-full min-w-0 bg-transparent py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none" /><button type="submit" className="text-sm font-medium text-gold-600">Search</button></form>
        <nav className="flex flex-col" aria-label="Mobile navigation">{nav.map(([label, href]) => <a key={href} href={href} onClick={closeMenu} className="flex min-h-12 items-center border-b border-line/70 text-base font-medium text-ink transition-colors hover:text-gold-600">{label}</a>)}</nav>
        <div className="mt-auto grid gap-3 border-t border-line pt-5"><a href="/book-appointment" onClick={closeMenu} className="inline-flex min-h-12 items-center justify-center rounded-lg border border-gold-500 text-sm font-semibold text-gold-700">Book Appointment</a><WhatsAppButton label="WhatsApp Expert" className="w-full" /></div>
      </div>
    </div>
  </>;
}
