"use client";

import { useState } from "react";
import WhatsAppButton from "./WhatsAppButton";

export default function FloatingContactButtons() {
  const [open, setOpen] = useState(false);
  return <>
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      <button type="button" onClick={() => setOpen(true)} className="group hidden min-h-12 items-center gap-3 rounded-full border border-gold-200 bg-ink px-5 text-sm font-semibold text-white shadow-elevated transition duration-300 hover:-translate-y-0.5 hover:border-gold-400 hover:bg-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:inline-flex">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-500 text-ink transition group-hover:bg-gold-300" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" /></svg>
        </span>
        <span>Call an expert</span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="Available now" />
      </button>
      <WhatsAppButton label="WhatsApp Expert" className="rounded-full px-4 shadow-elevated" />
    </div>
    <a href="tel:+919829407255" className="fixed bottom-5 left-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-gold-200 bg-ink text-white shadow-elevated transition hover:bg-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:hidden" aria-label="Call PS Jewellers">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" /></svg>
    </a>
    {open ? <a href="tel:+919829407255" className="fixed inset-0 z-[60] bg-ink/50" onClick={() => setOpen(false)} aria-label="Call PS Jewellers"><span className="sr-only">Call PS Jewellers</span></a> : null}
  </>;
}
