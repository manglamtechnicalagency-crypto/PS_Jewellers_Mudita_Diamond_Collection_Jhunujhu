"use client";
import { useState } from "react";
type Product = { id: string; name: string };
export default function BulkOperations({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [message, setMessage] = useState("");
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  async function apply() {
    const body = {
      ids: selected,
      ...(status ? { status } : {}),
      ...(stockStatus ? { stockStatus } : {}),
      ...(adjustment ? { priceAdjustment: Number(adjustment) } : {}),
    };
    const response = await fetch("/api/admin/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMessage(
      response.ok ? "Bulk changes applied live." : "Bulk changes failed",
    );
  }
  return (
    <section className="mt-6 rounded-xs border border-line bg-white p-5">
      <h2 className="font-serif text-2xl">Bulk operations</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Select products, then publish, archive, update stock, or adjust
        displayed prices.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <label key={product.id} className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(product.id)}
              onChange={() => toggle(product.id)}
            />
            {product.name}
          </label>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <select
          className="border border-line p-2 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Publication status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="border border-line p-2 text-sm"
          value={stockStatus}
          onChange={(event) => setStockStatus(event.target.value)}
        >
          <option value="">Stock status</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="made_to_order">Made to order</option>
        </select>
        <input
          className="w-44 border border-line p-2 text-sm"
          type="number"
          value={adjustment}
          onChange={(event) => setAdjustment(event.target.value)}
          placeholder="Price adjustment ₹"
        />
        <button
          type="button"
          disabled={
            !selected.length || (!status && !stockStatus && !adjustment)
          }
          onClick={() => void apply()}
          className="bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Apply to {selected.length}
        </button>
      </div>
      {message ? (
        <p className="mt-3 text-sm text-ink-soft" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
