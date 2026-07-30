"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Product } from "../types";
import { whatsappHref } from "../lib/storefront-enquiry";
import WhatsAppIcon from "./WhatsAppIcon";

interface InquiryPopupProps {
  product?: Product;
  open: boolean;
  onClose: () => void;
}

// One definition, applied to every control, so the fields cannot drift apart.
const FIELD =
  "min-h-12 w-full rounded-lg border border-line bg-white px-4 font-normal text-ink outline-none transition placeholder:text-muted/70 focus:border-gold-500 focus:ring-2 focus:ring-gold-100";
const LABEL = "grid gap-1.5 text-sm font-medium text-ink";

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="ml-0.5 text-gold-600">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

export default function InquiryPopup({ product, open, onClose }: InquiryPopupProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const dialogRef = useRef<HTMLElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // Remember what opened the dialog so focus can go back there on close —
    // otherwise a keyboard user is dumped at the top of the document.
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Trap Tab inside the dialog. Without this the page behind stays fully
      // focusable, so tabbing walks out of a modal that looks blocking.
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.body.classList.add("overflow-hidden");
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.classList.remove("overflow-hidden");
      restoreFocusRef.current?.focus?.();
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
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-title"
        aria-describedby="inquiry-subtitle"
        className="flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-2xl border border-gold-200 bg-paper shadow-elevated sm:max-w-lg sm:rounded-2xl"
      >
        {/* Header sits on cream so the form field area reads as a distinct zone. */}
        <div className="flex items-start justify-between gap-4 border-b border-line bg-cream px-6 pb-5 pt-6 sm:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-600">Private consultation</p>
            <h2 id="inquiry-title" className="mt-2 font-serif text-2xl leading-tight text-ink sm:text-3xl">Connect with a jewellery expert</h2>
            <p id="inquiry-subtitle" className="mt-2 text-sm leading-6 text-ink-soft">
              Share a few details and we will continue your enquiry on WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close enquiry form"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-ink-soft transition hover:border-gold-500 hover:text-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Scrolls independently so the CTA below never leaves the viewport. */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {product ? (
            <div className="mb-6 flex items-center gap-4 rounded-xl border border-line bg-cream p-3">
              {product.image ? (
                // next/image, not a raw <img>: the R2 originals are multi-megabyte
                // and this slot is 56px, so an unoptimised tag would pull the full
                // asset just to render a thumbnail.
                <Image src={product.image} alt="" width={56} height={56} sizes="56px" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Interested in</p>
                <p className="mt-0.5 truncate font-serif text-lg text-ink">{product.name}</p>
                <p className="truncate text-xs text-ink-soft">
                  {[product.category, product.purity, product.weight].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          ) : null}

          <form id="inquiry-form" className="grid gap-4" onSubmit={(event) => { event.preventDefault(); continueToWhatsapp(); }}>
            <label className={LABEL}>
              <span>Name<RequiredMark /></span>
              <input ref={firstFieldRef} required value={name} onChange={(event) => setName(event.target.value)} className={FIELD} placeholder="Your name" autoComplete="name" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={LABEL}>
                <span>Phone<RequiredMark /></span>
                {/* type="tel" so mobile shows the dial pad, not the text keyboard. */}
                <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={FIELD} placeholder="+91 98294 07255" inputMode="tel" autoComplete="tel" />
              </label>
              <label className={LABEL}>
                <span>City</span>
                <input value={city} onChange={(event) => setCity(event.target.value)} className={FIELD} placeholder="Jhunjhunu" autoComplete="address-level2" />
              </label>
            </div>
            <label className={LABEL}>
              <span>Message <span className="font-normal text-muted">(optional)</span></span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} className={`${FIELD} min-h-24 resize-y py-3`} placeholder="Tell us about your occasion, size or customisation." />
            </label>
          </form>
        </div>

        {/* Pinned footer: the CTA was previously the last item in a scrolling
            column, so on a short screen it sat below the fold. */}
        <div className="border-t border-line bg-paper px-6 pb-6 pt-4 sm:px-8">
          <button
            type="submit"
            form="inquiry-form"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-whatsapp px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-whatsapp-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp focus-visible:ring-offset-2"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Continue to WhatsApp
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-muted">
            Your details are used only to respond to this enquiry.
          </p>
        </div>
      </section>
    </div>
  );
}
