"use client";

import Link from "next/link";
import { useState } from "react";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  display_price: number | null;
  status: string;
  stock_quantity: number;
  primary_image_url?: string | null;
  primary_image_alt?: string;
}

export default function ProductManager({ initialProducts }: { initialProducts: ProductRow[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [message, setMessage] = useState("");

  async function updateProduct(product: ProductRow, field: "name" | "status" | "stockQuantity", value: string) {
    const body = field === "stockQuantity" ? { stockQuantity: Number(value) } : { [field]: value };
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { setMessage("Product could not be updated"); return; }
    const payload = (await response.json()) as { data: ProductRow };
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...payload.data } : item));
    void fetch("/api/admin/d1-sync", { method: "POST", headers: { "Content-Type": "application/json" } });
    setMessage("Product updated live.");
  }

  async function removeProduct(id: string) {
    if (!window.confirm("Archive this product from the live website?")) return;
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    if (response.ok) { setProducts((current) => current.filter((item) => item.id !== id)); void fetch("/api/admin/d1-sync", { method: "POST", headers: { "Content-Type": "application/json" } }); } else setMessage("Product could not be archived");
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl">Product list</h2>
        <Link href="/admin/products/new" className="bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-gold-500">
          + Add New Product
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xs border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-cream text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Pricing</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{products.map((product) => <tr key={product.id} className="border-b border-line last:border-0"><td className="px-4 py-4"><div className="flex items-center gap-3">{product.primary_image_url ? <img className="h-14 w-14 rounded-xs border border-line bg-cream object-cover" src={product.primary_image_url} alt={product.primary_image_alt || product.name} loading="lazy" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xs bg-cream text-center text-[10px] text-muted">No image</div>}<input className="w-full border border-line p-2" defaultValue={product.name} onBlur={(event) => { if (event.target.value !== product.name) void updateProduct(product, "name", event.target.value); }} /></div></td><td className="px-4 py-4"><select className="border border-line p-2" value={product.status} onChange={(event) => void updateProduct(product, "status", event.target.value)}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></td><td className="px-4 py-4"><input className="w-20 border border-line p-2" type="number" min="0" defaultValue={product.stock_quantity} onBlur={(event) => { if (Number(event.target.value) !== product.stock_quantity) void updateProduct(product, "stockQuantity", event.target.value); }} /></td><td className="px-4 py-4 text-muted">{product.display_price ? `₹${Number(product.display_price).toLocaleString("en-IN")}` : "On request"}</td><td className="px-4 py-4"><div className="flex gap-3"><Link className="font-semibold text-gold-700 hover:underline" href={`/admin/products/${product.id}/edit`}>Edit</Link><button className="text-sm text-red-700 hover:underline" onClick={() => void removeProduct(product.id)}>Archive</button></div></td></tr>)}</tbody>
        </table>
        {!products.length ? <p className="p-8 text-center text-sm text-muted">No products yet.</p> : null}
      </div>
      {message ? <p className="mt-3 text-sm text-ink-soft" role="status">{message}</p> : null}
    </section>
  );
}
