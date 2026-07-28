"use client";

import { useState } from "react";
import WhatsAppButton from "./WhatsAppButton";

export default function FloatingContactButtons() {
  const [open, setOpen] = useState(false);
  return <>
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      <button type="button" onClick={() => setOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-white shadow-elevated transition hover:bg-gold-600 sm:inline-flex"><span aria-hidden="true">📞</span> Call Expert</button>
      <WhatsAppButton label="WhatsApp Expert" className="rounded-full px-4 shadow-elevated" />
    </div>
    <a href="tel:+919829407255" className="fixed bottom-5 left-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink text-lg text-white shadow-elevated sm:hidden" aria-label="Call PS Jewellers">📞</a>
    {open ? <a href="tel:+919829407255" className="fixed inset-0 z-[60] bg-ink/50" onClick={() => setOpen(false)} aria-label="Call PS Jewellers"><span className="sr-only">Call PS Jewellers</span></a> : null}
  </>;
}
