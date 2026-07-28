"use client";

import { FormEvent, useState } from "react";
import { WHATSAPP_NUMBER } from "../lib/storefront-enquiry";

export default function AppointmentForm() {
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const message = [
      "Hello PS Jewellers,",
      "",
      "I would like to book a jewellery consultation.",
      `Name: ${values.get("name") ?? ""}`,
      `Phone: ${values.get("phone") ?? ""}`,
      `Purpose: ${values.get("purpose") ?? ""}`,
      `Date: ${values.get("date") ?? ""}`,
      `Time: ${values.get("time") ?? ""}`,
      `Mode: ${values.get("mode") ?? "Showroom visit"}`,
    ].join("\n");
    setSubmitted(true);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form id="appointment-form" onSubmit={submit} className="grid gap-4 rounded-xs border border-line bg-white p-6 shadow-soft sm:grid-cols-2">
      <label className="grid gap-1 text-sm text-ink">Name<input required name="name" className="rounded-lg border border-line px-3 py-3" /></label>
      <label className="grid gap-1 text-sm text-ink">Phone<input required name="phone" type="tel" className="rounded-lg border border-line px-3 py-3" /></label>
      <label className="grid gap-1 text-sm text-ink">Date<input required name="date" type="date" className="rounded-lg border border-line px-3 py-3" /></label>
      <label className="grid gap-1 text-sm text-ink">Time<input required name="time" type="time" className="rounded-lg border border-line px-3 py-3" /></label>
      <label className="grid gap-1 text-sm text-ink">Purpose<select name="purpose" className="rounded-lg border border-line px-3 py-3"><option>Bridal consultation</option><option>Diamond consultation</option><option>Custom jewellery</option><option>Gold investment</option></select></label>
      <label className="grid gap-1 text-sm text-ink">Mode<select name="mode" className="rounded-lg border border-line px-3 py-3"><option>Showroom visit</option><option>Video call</option><option>Personal consultation</option></select></label>
      <button type="submit" className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-gold-500 sm:col-span-2">📅 Continue to WhatsApp</button>
      {submitted ? <p className="text-sm text-gold-700 sm:col-span-2" role="status">Your appointment details are ready in WhatsApp.</p> : null}
    </form>
  );
}
