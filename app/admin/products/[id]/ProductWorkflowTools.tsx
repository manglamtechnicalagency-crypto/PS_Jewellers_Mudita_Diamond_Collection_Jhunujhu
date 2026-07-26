"use client";
import { useState } from "react";
type History = {
  id: string;
  previous_display_price: number | null;
  new_display_price: number | null;
  previous_price_on_request: boolean;
  new_price_on_request: boolean;
  created_at: string;
};
export default function ProductWorkflowTools({
  productId,
  productName,
  slug,
  priceHistory,
}: {
  productId: string;
  productName: string;
  slug: string;
  priceHistory: History[];
}) {
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  async function duplicate() {
    const response = await fetch(`/api/admin/products/${productId}/duplicate`, {
      method: "POST",
    });
    const payload = (await response.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    setMessage(
      response.ok && payload.data
        ? `Draft duplicated: /admin/products/${payload.data.id}`
        : (payload.error?.message ?? "Product could not be duplicated"),
    );
  }
  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="rounded-xs border border-line bg-white p-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="border border-line px-4 py-2 text-sm font-semibold"
            onClick={() => setPreview((current) => !current)}
          >
            {preview ? "Hide preview" : "Preview before publish"}
          </button>
          <a
            href={`/product/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="border border-line px-4 py-2 text-sm font-semibold"
          >
            Open live storefront
          </a>
          <button
            type="button"
            className="bg-ink px-4 py-2 text-sm font-semibold text-white"
            onClick={() => void duplicate()}
          >
            Duplicate as draft
          </button>
        </div>
        {preview ? (
          <div className="mt-5 rounded-xs border border-gold-300 bg-cream p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
              Saved storefront preview
            </p>
            <h2 className="mt-2 font-serif text-3xl">{productName}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              This preview uses the current saved product record. Drafts remain
              private; published records open in the public storefront link.
            </p>
          </div>
        ) : null}
        {message ? (
          <p className="mt-4 text-sm text-ink-soft" role="status">
            {message}
          </p>
        ) : null}
      </div>
      <div className="rounded-xs border border-line bg-white p-6">
        <h2 className="font-serif text-2xl">Price history</h2>
        <div className="mt-4 space-y-3">
          {priceHistory.map((entry) => (
            <div
              key={entry.id}
              className="border-b border-line pb-3 text-sm last:border-0"
            >
              <strong>
                {entry.previous_price_on_request
                  ? "On request"
                  : entry.previous_display_price === null
                    ? "No price"
                    : `₹${Number(entry.previous_display_price).toLocaleString("en-IN")}`}{" "}
                →{" "}
                {entry.new_price_on_request
                  ? "On request"
                  : entry.new_display_price === null
                    ? "No price"
                    : `₹${Number(entry.new_display_price).toLocaleString("en-IN")}`}
              </strong>
              <p className="mt-1 text-xs text-muted">
                {new Date(entry.created_at).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
          {!priceHistory.length ? (
            <p className="text-sm text-muted">No price changes recorded yet.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
