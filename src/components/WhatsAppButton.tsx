"use client";

import { useState } from "react";
import type { Product } from "../types";
import InquiryPopup from "./InquiryPopup";

interface WhatsAppButtonProps {
  product?: Product;
  label?: string;
  className?: string;
  variant?: "primary" | "ghost";
}

export default function WhatsAppButton({ product, label = product ? "Get Price on WhatsApp" : "WhatsApp Expert", className = "", variant = "primary" }: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 ${variant === "primary" ? "bg-[#1f8f55] text-white shadow-sm hover:bg-[#177544]" : "border border-gold-500 text-gold-700 hover:bg-gold-50"} ${className}`}><span aria-hidden="true">💬</span>{label}</button>
    <InquiryPopup product={product} open={open} onClose={() => setOpen(false)} />
  </>;
}
