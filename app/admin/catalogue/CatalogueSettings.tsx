"use client";

import { useState } from "react";

type Term = { id: string; kind: string; name: string; slug: string; parent_id: string | null; display_order: number; is_active: boolean };
type Rate = { id: string; metal: string; purity: string; rate_per_gram: number; effective_at: string; manual_override: boolean };

export default function CatalogueSettings({ initialTaxonomy, initialRates }: { initialTaxonomy: Term[]; initialRates: Rate[] }) {
  const [terms, setTerms] = useState(initialTaxonomy);
  const [rates, setRates] = useState(initialRates);
  const [term, setTerm] = useState({ kind: "category", name: "", slug: "" });
  const [rate, setRate] = useState({ metal: "Gold", purity: "22K", ratePerGram: "" });
  const [message, setMessage] = useState("");

  async function addTerm(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/admin/taxonomy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...term, displayOrder: terms.filter((item) => item.kind === term.kind).length }) });
    const payload = await response.json() as { data?: Term; error?: { message?: string } };
    if (!response.ok) { setMessage(payload.error?.message ?? "Taxonomy term could not be created"); return; }
    if (payload.data) setTerms((current) => [...current, payload.data!]);
    setTerm({ ...term, name: "", slug: "" }); setMessage("Taxonomy term created.");
  }

  async function archiveTerm(id: string) {
    if (!window.confirm("Archive this taxonomy term? Products using it will keep their reference.")) return;
    const response = await fetch(`/api/admin/taxonomy?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { setMessage("Taxonomy term could not be archived"); return; }
    setTerms((current) => current.filter((item) => item.id !== id)); setMessage("Taxonomy term archived.");
  }

  async function saveRate(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/admin/metal-rates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rate, ratePerGram: Number(rate.ratePerGram) }) });
    const payload = await response.json() as { data?: Rate; error?: { message?: string } };
    if (!response.ok) { setMessage(payload.error?.message ?? "Metal rate could not be saved"); return; }
    if (payload.data) setRates((current) => [...current.filter((item) => item.id !== payload.data!.id), payload.data!].sort((a, b) => `${a.metal}${a.purity}`.localeCompare(`${b.metal}${b.purity}`)));
    setRate({ ...rate, ratePerGram: "" }); setMessage("Metal rate updated and recorded in the audit history.");
  }

  return <div className="mt-8 grid gap-8 lg:grid-cols-2"><section><form className="grid gap-3 rounded-xs border border-line bg-white p-5" onSubmit={addTerm}><h2 className="font-serif text-2xl">Taxonomy</h2><label className="text-sm font-medium">Type<select className="mt-1 w-full border border-line p-2" value={term.kind} onChange={(event) => setTerm({ ...term, kind: event.target.value })}><option value="category">Category</option><option value="collection">Collection</option><option value="subcategory">Subcategory</option></select></label><label className="text-sm font-medium">Name<input className="mt-1 w-full border border-line p-2" value={term.name} onChange={(event) => setTerm({ ...term, name: event.target.value })} required /></label><label className="text-sm font-medium">Slug<input className="mt-1 w-full border border-line p-2" value={term.slug} onChange={(event) => setTerm({ ...term, slug: event.target.value })} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><button className="bg-ink px-4 py-2 text-sm font-semibold text-white">Add term</button></form><div className="mt-4 divide-y divide-line rounded-xs border border-line bg-white">{terms.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 p-4 text-sm"><span><strong>{item.name}</strong><span className="ml-2 text-muted">{item.kind} · {item.slug}</span></span><button className="text-red-700 hover:underline" onClick={() => void archiveTerm(item.id)}>Archive</button></div>)}{!terms.length ? <p className="p-6 text-sm text-muted">No active taxonomy terms.</p> : null}</div></section><section><form className="grid gap-3 rounded-xs border border-line bg-white p-5" onSubmit={saveRate}><h2 className="font-serif text-2xl">Metal rates</h2><label className="text-sm font-medium">Metal<input className="mt-1 w-full border border-line p-2" value={rate.metal} onChange={(event) => setRate({ ...rate, metal: event.target.value })} required /></label><label className="text-sm font-medium">Purity<input className="mt-1 w-full border border-line p-2" value={rate.purity} onChange={(event) => setRate({ ...rate, purity: event.target.value })} required /></label><label className="text-sm font-medium">Rate per gram<input className="mt-1 w-full border border-line p-2" type="number" min="0.01" step="0.0001" value={rate.ratePerGram} onChange={(event) => setRate({ ...rate, ratePerGram: event.target.value })} required /></label><button className="bg-ink px-4 py-2 text-sm font-semibold text-white">Save rate</button></form><div className="mt-4 divide-y divide-line rounded-xs border border-line bg-white">{rates.map((item) => <div key={item.id} className="flex items-center justify-between p-4 text-sm"><span><strong>{item.metal} {item.purity}</strong><span className="ml-2 text-muted">₹{Number(item.rate_per_gram).toLocaleString("en-IN")}/g</span></span><span className="text-muted">{new Date(item.effective_at).toLocaleDateString("en-IN")}</span></div>)}{!rates.length ? <p className="p-6 text-sm text-muted">No metal rates configured.</p> : null}</div></section>{message ? <p className="text-sm text-ink-soft lg:col-span-2" role="status">{message}</p> : null}</div>;
}
