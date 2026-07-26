"use client";

import { useState } from "react";

type HomepageSettings = { heroEyebrow: string; heroTitle: string; heroDescription: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string };

const defaults: HomepageSettings = { heroEyebrow: "PS Jewellers · Jhunjhunu", heroTitle: "Luxury jewellery crafted for life's finest occasions.", heroDescription: "BIS hallmarked gold, certified diamonds and handcrafted 925 silver, from our Jhunjhunu showroom.", primaryCtaLabel: "Shop Collection", primaryCtaHref: "/shop", secondaryCtaLabel: "Book Appointment", secondaryCtaHref: "/book-appointment" };

export default function SettingsManager({ initialValue }: { initialValue: Record<string, string> }) {
  const [value, setValue] = useState<HomepageSettings>({ ...defaults, ...initialValue });
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settingKey: "homepage", value }) });
    const payload = await response.json() as { error?: { message?: string } };
    setMessage(response.ok ? "Homepage settings saved. The live site will use them on its next refresh." : payload.error?.message ?? "Settings could not be saved");
  }
  return <form onSubmit={save} className="mt-8 grid gap-4 rounded-xs border border-line bg-white p-6"><label className="text-sm font-medium">Eyebrow<input className="mt-1 w-full border border-line p-3" value={value.heroEyebrow} onChange={(event) => setValue({ ...value, heroEyebrow: event.target.value })} /></label><label className="text-sm font-medium">Hero title<textarea className="mt-1 min-h-24 w-full border border-line p-3" value={value.heroTitle} onChange={(event) => setValue({ ...value, heroTitle: event.target.value })} /></label><label className="text-sm font-medium">Hero description<textarea className="mt-1 min-h-24 w-full border border-line p-3" value={value.heroDescription} onChange={(event) => setValue({ ...value, heroDescription: event.target.value })} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Primary CTA label<input className="mt-1 w-full border border-line p-3" value={value.primaryCtaLabel} onChange={(event) => setValue({ ...value, primaryCtaLabel: event.target.value })} /></label><label className="text-sm font-medium">Primary CTA path<input className="mt-1 w-full border border-line p-3" value={value.primaryCtaHref} onChange={(event) => setValue({ ...value, primaryCtaHref: event.target.value })} /></label><label className="text-sm font-medium">Secondary CTA label<input className="mt-1 w-full border border-line p-3" value={value.secondaryCtaLabel} onChange={(event) => setValue({ ...value, secondaryCtaLabel: event.target.value })} /></label><label className="text-sm font-medium">Secondary CTA path<input className="mt-1 w-full border border-line p-3" value={value.secondaryCtaHref} onChange={(event) => setValue({ ...value, secondaryCtaHref: event.target.value })} /></label></div><button className="w-fit bg-ink px-5 py-3 text-sm font-semibold text-white">Save homepage settings</button>{message ? <p className="text-sm text-ink-soft" role="status">{message}</p> : null}</form>;
}
