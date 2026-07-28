"use client";

import { useEffect, useState } from "react";
import type { Product } from "../types";
import { whatsappHref } from "../lib/storefront-enquiry";

interface InquiryPopupProps {
  product?: Product;
  open: boolean;
  onClose: () => void;
}

export default function InquiryPopup({ product, open, onClose }: InquiryPopupProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open, onClose]);

  if (!open) return null;

  const continueToWhatsapp = () => {
    const customerMessage = [
      name.trim() ? `Name: ${name.trim()}` : "",
      phone.trim() ? `Phone: ${phone.trim()}` : "",
      city.trim() ? `City: ${city.trim()}` : "",
      message.trim(),
    ].filter(Boolean).join("\n");
    const href = product
      ? whatsappHref(product, undefined, window.location.href, customerMessage)
      : `https://wa.me/919829407255?text=${encodeURIComponent(`Hello PS Jewellers,\n\n${customerMessage || "I would like to speak with a jewellery expert."}`)}`;
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="inquiry-title" className="max-h-[92svh] w-full overflow-y-auto rounded-t-2xl border border-gold-200 bg-paper p-6 shadow-elevated sm:max-w-lg sm:rounded-2xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-600">Private consultation</p>
            <h2 id="inquiry-title" className="mt-2 font-serif text-3xl text-ink">Connect with a jewellery expert</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Share a few details and we will continue your enquiry on WhatsApp.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close enquiry form" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-xl text-ink-soft hover:border-gold-500 hover:text-gold-600">×</button>
        </div>

        {product ? <div className="mt-5 rounded-xl bg-cream p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted">Interested in</p><p className="mt-1 font-serif text-xl text-ink">{product.name}</p><p className="mt-1 text-sm text-ink-soft">{product.category} · {product.purity} · {product.weight}</p></div> : null}

        <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); continueToWhatsapp(); }}>
          <label className="grid gap-1.5 text-sm font-medium text-ink">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 rounded-lg border border-line bg-white px-4 font-normal outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-100" placeholder="Your name" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-ink">Phone<input required value={phone} onChange={(event) => setPhone(event.target.value)} className="min-h-12 rounded-lg border border-line bg-white px-4 font-normal outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-100" placeholder="+91" inputMode="tel" /></label><label className="grid gap-1.5 text-sm font-medium text-ink">City<input value={city} onChange={(event) => setCity(event.target.value)} className="min-h-12 rounded-lg border border-line bg-white px-4 font-normal outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-100" placeholder="Jhunjhunu" /></label></div>
          <label className="grid gap-1.5 text-sm font-medium text-ink">Optional message<textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-24 resize-y rounded-lg border border-line bg-white px-4 py-3 font-normal outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-100" placeholder="Tell us about your occasion, size or customisation." /></label>
          <button type="submit" className="mt-1 inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-[#1f8f55] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#177544] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f8f55] focus-visible:ring-offset-2">Continue to WhatsApp <span aria-hidden="true">↗</span></button>
          <p className="text-center text-xs text-muted">Your details are used only to respond to this enquiry.</p>
        </form>
      </section>
    </div>
  );
}
