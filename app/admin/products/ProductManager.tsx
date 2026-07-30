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

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
}

export default function ProductManager({ initialProducts, pagination }: { initialProducts: ProductRow[]; pagination?: Pagination }) {
  const [products, setProducts] = useState(initialProducts);
  const [message, setMessage] = useState("");

  async function updateProduct(product: ProductRow, field: "name" | "status" | "stockQuantity", value: string) {
    const body = field === "stockQuantity" ? { stockQuantity: Number(value) } : { [field]: value };
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      setMessage(payload?.error?.message ?? `Product could not be updated (${response.status})`);
      return;
    }
    const payload = (await response.json()) as { data: ProductRow };
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...payload.data } : item));
    void fetch("/api/admin/d1-sync", { method: "POST", headers: { "Content-Type": "application/json" } });
    setMessage("Product updated live.");
  }

  async function removeProduct(id: string) {
    if (!window.confirm("Delete this product from the live website?")) return;
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
    if (response.ok) { setProducts((current) => current.filter((item) => item.id !== id)); void fetch("/api/admin/d1-sync", { method: "POST", headers: { "Content-Type": "application/json" } }); } else setMessage("Product could not be deleted");
  }

  function ProductImage({ product, size }: { product: ProductRow; size: "mobile" | "desktop" }) {
    const className = size === "mobile" ? "h-28 w-28" : "h-24 w-24";
    return product.primary_image_url ? <img className={`${className} shrink-0 rounded-xs border border-line bg-cream p-1 object-contain shadow-sm`} src={product.primary_image_url} alt={product.primary_image_alt || product.name} loading="lazy" /> : <div className={`${className} flex shrink-0 items-center justify-center rounded-xs border border-line bg-cream p-2 text-center text-xs text-muted`}>No image</div>;
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="font-serif text-2xl">Product list</h2>
        <Link href="/admin/products/new" className="w-full bg-ink px-4 py-3 text-center text-sm font-semibold text-white hover:bg-gold-500 sm:w-auto">
          + Add New Product
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-xs border border-line bg-white">
        <div className="divide-y divide-line lg:hidden">
          {products.map((product) => <article key={product.id} className="p-4">
            <div className="flex items-start gap-4">
              <ProductImage product={product} size="mobile" />
              <div className="min-w-0 flex-1">
                <p className="break-words border border-line bg-cream p-3 text-sm font-medium leading-6" aria-label={`Product name: ${product.name}`}>{product.name}</p>
                <p className="mt-2 text-sm text-muted">{product.display_price ? `₹${Number(product.display_price).toLocaleString("en-IN")}` : "On request"}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Status<select className="mt-1 min-h-11 w-full border border-line bg-white px-3 text-sm font-normal text-ink" value={product.status} onChange={(event) => void updateProduct(product, "status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">Stock<input className="mt-1 min-h-11 w-full border border-line p-3 text-sm font-normal text-ink" type="number" min="0" defaultValue={product.stock_quantity} onBlur={(event) => { if (Number(event.target.value) !== product.stock_quantity) void updateProduct(product, "stockQuantity", event.target.value); }} /></label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link className="inline-flex min-h-11 items-center justify-center border border-line px-4 text-sm font-semibold text-gold-700 hover:border-gold-500" href={`/admin/products/${product.id}/edit`}>Edit</Link>
              <button className="min-h-11 border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => void removeProduct(product.id)}>Delete</button>
            </div>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-line bg-cream text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Pricing</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{products.map((product) => <tr key={product.id} className="border-b border-line align-middle last:border-0"><td className="px-5 py-5"><div className="flex min-w-[360px] items-center gap-5"><ProductImage product={product} size="desktop" /><span className="w-full border border-line bg-cream p-3 leading-6" aria-label={`Product name: ${product.name}`}>{product.name}</span></div></td><td className="px-5 py-5"><select className="border border-line bg-white p-3" value={product.status} onChange={(event) => void updateProduct(product, "status", event.target.value)}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select></td><td className="px-5 py-5"><input className="w-24 border border-line p-3" type="number" min="0" defaultValue={product.stock_quantity} onBlur={(event) => { if (Number(event.target.value) !== product.stock_quantity) void updateProduct(product, "stockQuantity", event.target.value); }} /></td><td className="px-5 py-5 text-muted">{product.display_price ? `₹${Number(product.display_price).toLocaleString("en-IN")}` : "On request"}</td><td className="px-5 py-5"><div className="flex gap-4"><Link className="font-semibold text-gold-700 hover:underline" href={`/admin/products/${product.id}/edit`}>Edit</Link><button className="text-sm text-red-700 hover:underline" onClick={() => void removeProduct(product.id)}>Delete</button></div></td></tr>)}</tbody>
        </table>
        </div>
        {!products.length ? <p className="p-8 text-center text-sm text-muted">No products yet.</p> : null}
      </div>
      {pagination ? (
        <nav className="mt-4 flex flex-col items-stretch justify-between gap-3 rounded-xs border border-line bg-cream px-4 py-3 sm:flex-row sm:items-center" aria-label="Product list pages">
          <p className="text-sm text-ink-soft">
            {pagination.total ? `Showing ${pagination.rangeStart}–${pagination.rangeEnd} of ${pagination.total}` : "Showing 0 of 0"}
          </p>
          <div className="flex items-center gap-3">
            {pagination.page > 1 ? (
              <a className="inline-flex min-h-11 items-center justify-center rounded-xs border border-line px-4 text-sm font-semibold text-gold-700 hover:border-gold-500" href={`/admin/products?page=${pagination.page - 1}`}>
                Previous
              </a>
            ) : (
              <span className="inline-flex min-h-11 items-center justify-center rounded-xs border border-line px-4 text-sm font-semibold text-muted opacity-50" aria-disabled="true">
                Previous
              </span>
            )}
            <span className="text-sm text-muted">Page {pagination.page} of {pagination.totalPages}</span>
            {pagination.page < pagination.totalPages ? (
              <a className="inline-flex min-h-11 items-center justify-center rounded-xs border border-line px-4 text-sm font-semibold text-gold-700 hover:border-gold-500" href={`/admin/products?page=${pagination.page + 1}`}>
                Next
              </a>
            ) : (
              <span className="inline-flex min-h-11 items-center justify-center rounded-xs border border-line px-4 text-sm font-semibold text-muted opacity-50" aria-disabled="true">
                Next
              </span>
            )}
          </div>
        </nav>
      ) : null}
      {message ? <p className="mt-3 text-sm text-ink-soft" role="status">{message}</p> : null}
    </section>
  );
}
