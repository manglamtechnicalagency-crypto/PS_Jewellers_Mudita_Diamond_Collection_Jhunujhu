"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProductRow { id: string; sku: string; slug: string; name: string; display_price: number | null; status: string; stock_quantity: number; updated_at: string; }
interface Category { id: string; kind: string; name: string; }

export default function ProductManager({ initialProducts }: { initialProducts: ProductRow[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ sku: "", slug: "", name: "", categoryId: "", basePrice: "", stockQuantity: "0", status: "draft" });
  const [message, setMessage] = useState("");
  useEffect(() => { void fetch("/api/admin/taxonomy", { cache: "no-store" }).then((response) => response.json()).then((payload: { data?: Category[] }) => setCategories((payload.data ?? []).filter((item) => item.kind === "category"))).catch(() => undefined); }, []);

  async function createProduct(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: form.sku, slug: form.slug, name: form.name, categoryId: form.categoryId, basePrice: form.basePrice ? Number(form.basePrice) : null, stockQuantity: Number(form.stockQuantity), status: form.status }) });
    const payload = (await response.json()) as { data?: ProductRow; error?: { message: string } };
    if (!response.ok) { setMessage(payload.error?.message ?? "Product could not be created"); return; }
    if (payload.data) setProducts((current) => [payload.data!, ...current]);
    void fetch("/api/admin/d1-sync", { method: "POST", headers: { "Content-Type": "application/json" } });
    setForm({ sku: "", slug: "", name: "", categoryId: form.categoryId, basePrice: "", stockQuantity: "0", status: "draft" }); setMessage("Product created.");
  }

  async function updateProduct(product: ProductRow, field: "name" | "status" | "stockQuantity", value: string) {
    const body = field === "stockQuantity" ? { stockQuantity: Number(value) } : { [field]: value };
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { setMessage("Product could not be updated"); return; }
    const payload = (await response.json()) as { data: ProductRow };
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...payload.data } : item)); void fetch("/api/admin/d1-sync", { method: "POST", headers: { "Content-Type": "application/json" } }); setMessage("Product updated live.");
  }

  async function removeProduct(id: string) {
    if (!window.confirm("Archive this product from the live website?")) return;
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    if (response.ok) { setProducts((current) => current.filter((item) => item.id !== id)); void fetch("/api/admin/d1-sync", { method: "POST", headers: { "Content-Type": "application/json" } }); } else setMessage("Product could not be archived");
  }

  return <section className="mt-8"><form className="grid gap-3 rounded-xs border border-line bg-white p-5 md:grid-cols-4" onSubmit={createProduct}><h2 className="font-serif text-2xl md:col-span-4">Add product</h2>{([['sku','SKU'],['slug','Slug'],['name','Name'],['basePrice','Base price'],['stockQuantity','Stock']] as const).map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<input className="mt-1 w-full border border-line p-2" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={key !== 'basePrice'} /></label>)}<label className="text-sm font-medium">Category<select className="mt-1 w-full border border-line p-2" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required><option value="">Select</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="text-sm font-medium">Status<select className="mt-1 w-full border border-line p-2" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><button className="bg-ink px-4 py-2 text-sm font-semibold text-white md:col-span-4">Create product</button>{message ? <p className="text-sm text-ink-soft md:col-span-4" role="status">{message}</p> : null}</form><div className="mt-6 overflow-x-auto rounded-xs border border-line bg-white"><table className="w-full min-w-[950px] text-left text-sm"><thead className="border-b border-line bg-cream text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Pricing</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-line last:border-0"><td className="px-4 py-4"><input className="w-full border border-line p-2" defaultValue={product.name} onBlur={(event) => { if (event.target.value !== product.name) void updateProduct(product, "name", event.target.value); }} /></td><td className="px-4 py-4 text-muted">{product.sku}</td><td className="px-4 py-4"><select className="border border-line p-2" value={product.status} onChange={(event) => void updateProduct(product, "status", event.target.value)}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></td><td className="px-4 py-4"><input className="w-20 border border-line p-2" type="number" min="0" defaultValue={product.stock_quantity} onBlur={(event) => { if (Number(event.target.value) !== product.stock_quantity) void updateProduct(product, "stockQuantity", event.target.value); }} /></td><td className="px-4 py-4 text-muted">{product.display_price ? `₹${Number(product.display_price).toLocaleString("en-IN")}` : "On request"}</td><td className="px-4 py-4"><div className="flex gap-3"><Link className="font-semibold text-gold-700 hover:underline" href={`/admin/products/${product.id}`}>Edit all</Link><button className="text-sm text-red-700 hover:underline" onClick={() => void removeProduct(product.id)}>Archive</button></div></td></tr>)}</tbody></table>{!products.length ? <p className="p-8 text-center text-sm text-muted">No products yet. Run the migrations and choose a category above.</p> : null}</div></section>;
}
