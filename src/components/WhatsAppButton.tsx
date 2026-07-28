"use client";

import { useState } from "react";
import type { Product } from "../types";
import { whatsappHref } from "../lib/storefront-enquiry";
import InquiryPopup from "./InquiryPopup";

interface WhatsAppButtonProps {
  product?: Product;
  label?: string;
  className?: string;
  variant?: "primary" | "ghost";
}

export default function WhatsAppButton({ product, label = product ? "Get Price on WhatsApp" : "WhatsApp Expert", className = "", variant = "primary" }: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false);

  function openWhatsapp() {
    if (!product) {
      setOpen(true);
      return;
    }
    window.open(whatsappHref(product, undefined, window.location.href), "_blank", "noopener,noreferrer");
  }

  return <>
    <button type="button" onClick={openWhatsapp} aria-label={label} className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold tracking-[0.01em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${variant === "primary" ? "border border-gold-300 bg-gradient-to-r from-[#a77b2c] via-[#d6b15b] to-[#966b23] text-white shadow-[0_8px_24px_rgba(151,108,35,0.22)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(151,108,35,0.32)]" : "border border-gold-500 text-gold-700 hover:bg-gold-50"} ${className}`}>
      <span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${variant === "primary" ? "border border-white/40 bg-white/15" : "bg-gold-50"}`}>⌁</span>
      <span>{label}</span>
      {product ? <span aria-hidden="true" className="ml-1 transition-transform duration-300 group-hover:translate-x-0.5">↗</span> : null}
    </button>
    <InquiryPopup product={product} open={open} onClose={() => setOpen(false)} />
  </>;
}
