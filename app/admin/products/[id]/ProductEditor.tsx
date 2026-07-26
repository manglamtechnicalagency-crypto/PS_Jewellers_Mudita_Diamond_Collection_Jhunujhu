"use client";

import { useState } from "react";

type Product = Record<string, unknown> & {
  id: string;
  name: string;
  price_mode: string;
  price_on_request: boolean;
  display_price: number | null;
};
type Pricing = { total?: number; is_priceable?: boolean } | null;
type MediaLink = Record<string, unknown> & {
  media_id: string;
  role: string;
  display_order: number;
};
type Review = Record<string, unknown> & { id: string; status: string };
const textFields = [
  ["name", "Product name"],
  ["sku", "SKU"],
  ["slug", "Slug"],
  ["short_description", "Short description"],
  ["long_description", "Long description"],
  ["metal_type", "Metal type"],
  ["metal_purity", "Metal purity"],
  ["stone_type", "Stone type"],
  ["stone_clarity", "Stone clarity"],
  ["stone_colour", "Stone colour"],
  ["certification", "Certification"],
  ["certificate_number", "Certificate number"],
  ["hallmark_code", "Hallmark code"],
  ["seo_title", "SEO title"],
  ["seo_description", "SEO description"],
] as const;
const numberFields = [
  ["metal_weight_grams", "Metal weight (g)"],
  ["gross_weight_grams", "Gross weight (g)"],
  ["net_weight_grams", "Net weight (g)"],
  ["stone_carat", "Stone carat"],
  ["stone_count", "Stone count"],
  ["base_price", "Base price"],
  ["making_charges", "Making charges"],
  ["wastage_percent", "Wastage %"],
  ["gst_percent", "GST %"],
  ["discount_value", "Discount value"],
  ["stock_quantity", "Stock quantity"],
  ["display_order", "Display order"],
] as const;

function csv(value: unknown) {
  return Array.isArray(value)
    ? value.join(", ")
    : typeof value === "string"
      ? value
      : "";
}
function numberOrNull(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export default function ProductEditor({
  initialProduct,
  initialMedia,
  initialReviews,
  initialPricing,
}: {
  initialProduct: Product;
  initialMedia: MediaLink[];
  initialReviews: Review[];
  initialPricing: Pricing;
}) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [mediaLinks, setMediaLinks] = useState(initialMedia);
  const [pricing, setPricing] = useState(initialPricing);
  const [reviews, setReviews] = useState(initialReviews);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAcknowledged, setPreviewAcknowledged] = useState(false);
  function setValue(key: string, value: unknown) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (product.status === "published" && !previewAcknowledged) {
      setPreviewOpen(true);
      setMessage(
        "Review the publish preview and confirm it before publishing.",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    const body: Record<string, unknown> = {};
    for (const [key] of textFields) body[key] = String(product[key] ?? "");
    const nullable = new Set([
      "metal_weight_grams",
      "gross_weight_grams",
      "net_weight_grams",
      "stone_carat",
      "stone_count",
      "base_price",
    ]);
    for (const [key] of numberFields)
      body[key] =
        product[key] === null || product[key] === undefined
          ? nullable.has(key)
            ? null
            : 0
          : Number(product[key]);
    body.priceMode = product.price_mode;
    body.status = product.status;
    body.stockStatus = product.stock_status;
    body.categoryId = product.category_id;
    body.subcategoryId = product.subcategory_id ?? null;
    body.collectionId = product.collection_id ?? null;
    body.discountType = product.discount_type ?? null;
    body.sizeOptions = csv(product.size_options)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    body.tags = csv(product.tags)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    body.seoKeywords = csv(product.seo_keywords)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    body.isFeatured = Boolean(product.is_featured);
    body.isNewArrival = Boolean(product.is_new_arrival);
    body.isBestSeller = Boolean(product.is_best_seller);
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      data?: Product;
      pricing?: Pricing;
      error?: { message?: string };
    };
    if (response.ok && payload.data) {
      setProduct(payload.data);
      setPricing(payload.pricing ?? pricing);
      setMessage("Product saved and pricing recalculated live.");
    } else setMessage(payload.error?.message ?? "Product could not be saved");
    setSaving(false);
  }

  function moveMedia(index: number, direction: -1 | 1) {
    const next = [...mediaLinks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setMediaLinks(
      next.map((item, order) => ({ ...item, display_order: order })),
    );
  }
  function dropMedia(target: number) {
    if (dragIndex === null || dragIndex === target) return;
    const next = [...mediaLinks];
    const [item] = next.splice(dragIndex, 1);
    next.splice(target, 0, item);
    setMediaLinks(
      next.map((entry, order) => ({ ...entry, display_order: order })),
    );
    setDragIndex(null);
  }
  async function saveMediaOrder() {
    const response = await fetch(`/api/admin/products/${product.id}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        links: mediaLinks.map((item) => ({
          mediaId: item.media_id,
          role: item.role,
          displayOrder: item.display_order,
        })),
      }),
    });
    setMessage(
      response.ok
        ? "Media order saved live."
        : "Media order could not be saved",
    );
  }
  async function moderateReview(review: Review, status: string) {
    const response = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: review.id, status, moderationNote: "" }),
    });
    if (response.ok)
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id ? { ...item, status } : item,
        ),
      );
    setMessage(
      response.ok ? `Review ${status}.` : "Review could not be moderated",
    );
  }

  const primaryCount = mediaLinks.filter(
    (item) => item.role === "primary",
  ).length;
  const galleryCount = mediaLinks.filter(
    (item) => item.role === "gallery",
  ).length;
  const videoCount = mediaLinks.filter((item) =>
    String(
      (item.media as Record<string, unknown> | null)?.mime_type ?? "",
    ).startsWith("video/"),
  ).length;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
      <form onSubmit={save} className="grid gap-6">
        <section className="grid gap-4 rounded-xs border border-line bg-white p-6 sm:grid-cols-2">
          <h2 className="font-serif text-2xl sm:col-span-2">
            Identity and description
          </h2>
          {textFields.map(([key, label]) => (
            <label
              key={key}
              className={`text-sm font-medium ${key.includes("description") ? "sm:col-span-2" : ""}`}
            >
              {label}
              {key.includes("description") ? (
                <textarea
                  className="mt-1 min-h-24 w-full border border-line p-3"
                  value={String(product[key] ?? "")}
                  onChange={(event) => setValue(key, event.target.value)}
                />
              ) : (
                <input
                  className="mt-1 w-full border border-line p-3"
                  value={String(product[key] ?? "")}
                  onChange={(event) => setValue(key, event.target.value)}
                />
              )}
            </label>
          ))}
          <label className="text-sm font-medium">
            Status
            <select
              className="mt-1 w-full border border-line p-3"
              value={String(product.status ?? "draft")}
              onChange={(event) => setValue("status", event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Stock status
            <select
              className="mt-1 w-full border border-line p-3"
              value={String(product.stock_status ?? "in_stock")}
              onChange={(event) => setValue("stock_status", event.target.value)}
            >
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="made_to_order">Made to order</option>
            </select>
          </label>
        </section>
        <section className="grid gap-4 rounded-xs border border-line bg-white p-6 sm:grid-cols-2">
          <h2 className="font-serif text-2xl sm:col-span-2">
            Pricing and inventory
          </h2>
          <label className="text-sm font-medium">
            Pricing mode
            <select
              className="mt-1 w-full border border-line p-3"
              value={String(product.price_mode)}
              onChange={(event) => setValue("price_mode", event.target.value)}
            >
              <option value="fixed">Fixed price</option>
              <option value="on_request">Price on request</option>
              <option value="weight_based">Weight-based</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Discount type
            <select
              className="mt-1 w-full border border-line p-3"
              value={String(product.discount_type ?? "")}
              onChange={(event) =>
                setValue("discount_type", event.target.value || null)
              }
            >
              <option value="">None</option>
              <option value="flat">Flat</option>
              <option value="percentage">Percentage</option>
            </select>
          </label>
          {numberFields.map(([key, label]) => (
            <label key={key} className="text-sm font-medium">
              {label}
              <input
                className="mt-1 w-full border border-line p-3"
                type="number"
                step="0.01"
                min="0"
                value={
                  product[key] === null || product[key] === undefined
                    ? ""
                    : String(product[key])
                }
                onChange={(event) =>
                  setValue(key, numberOrNull(event.target.value))
                }
              />
            </label>
          ))}
          <div className="rounded-xs bg-cream p-4 text-sm sm:col-span-2">
            {product.price_mode === "on_request" || product.price_on_request
              ? "Price on request — enquiry CTA is shown publicly."
              : pricing?.is_priceable === false
                ? "Missing weight or metal rate — public price safely falls back to enquiry."
                : pricing?.total
                  ? `₹${Number(pricing.total).toLocaleString("en-IN")} · live calculation`
                  : product.display_price
                    ? `₹${Number(product.display_price).toLocaleString("en-IN")}`
                    : "Save to calculate"}
          </div>
        </section>
        <section className="grid gap-4 rounded-xs border border-line bg-white p-6 sm:grid-cols-2">
          <h2 className="font-serif text-2xl sm:col-span-2">
            Search, merchandising, and display
          </h2>
          {[
            ["size_options", "Size options"],
            ["tags", "Tags"],
            ["seo_keywords", "SEO keywords"],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-medium">
              {label}
              <input
                className="mt-1 w-full border border-line p-3"
                value={csv(product[key])}
                onChange={(event) => setValue(key, event.target.value)}
                placeholder="Comma separated"
              />
            </label>
          ))}
          {[
            ["is_featured", "Featured"],
            ["is_new_arrival", "New arrival"],
            ["is_best_seller", "Best seller"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 text-sm font-medium"
            >
              <input
                type="checkbox"
                checked={Boolean(product[key])}
                onChange={(event) => setValue(key, event.target.checked)}
              />
              {label}
            </label>
          ))}
        </section>
        {previewOpen ? (
          <section className="rounded-xs border border-gold-300 bg-cream p-5 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">
              Publish preview
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              {String(product.name ?? "Untitled product")}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {product.price_mode === "on_request" || product.price_on_request
                ? "Price on request"
                : product.display_price
                  ? `₹${Number(product.display_price).toLocaleString("en-IN")}`
                  : "Price will be calculated on save"}
              {" · "}
              {mediaLinks.length} linked media item
              {mediaLinks.length === 1 ? "" : "s"}
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={previewAcknowledged}
                onChange={(event) =>
                  setPreviewAcknowledged(event.target.checked)
                }
              />
              I reviewed this product before publishing.
            </label>
          </section>
        ) : null}
        <button
          className="w-fit bg-ink px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save product and recalculate price"}
        </button>
        {message ? (
          <p className="text-sm text-ink-soft" role="status">
            {message}
          </p>
        ) : null}
      </form>
      <aside className="space-y-6">
        <section className="rounded-xs border border-line bg-white p-6">
          <h2 className="font-serif text-2xl">Media checklist</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xs bg-cream p-2">
              <strong className="block text-lg">{primaryCount}</strong>Primary
            </div>
            <div className="rounded-xs bg-cream p-2">
              <strong className="block text-lg">{galleryCount}</strong>Gallery
            </div>
            <div className="rounded-xs bg-cream p-2">
              <strong className="block text-lg">{videoCount}</strong>Videos
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Recommended: one primary image, multiple gallery images, and
            optional videos.
          </p>
          <div className="mt-4 space-y-3">
            {mediaLinks.map((item, index) => (
              <div
                key={`${item.media_id}-${index}`}
                className="flex items-center justify-between gap-2 rounded-xs bg-cream p-3 text-sm"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropMedia(index)}
              >
                <span>
                  <strong>{item.role}</strong>
                  <p className="break-all text-xs text-muted">
                    {String(
                      (item.media as Record<string, unknown> | null)
                        ?.original_filename ?? "R2 media",
                    )}
                  </p>
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="border border-line px-2 py-1"
                    onClick={() => moveMedia(index, -1)}
                    aria-label="Move media up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="border border-line px-2 py-1"
                    onClick={() => moveMedia(index, 1)}
                    aria-label="Move media down"
                  >
                    ↓
                  </button>
                </span>
              </div>
            ))}
            {!mediaLinks.length ? (
              <p className="text-sm text-muted">No linked media yet.</p>
            ) : null}
            <button
              type="button"
              className="w-full border border-line px-3 py-2 text-sm font-semibold"
              onClick={() => void saveMediaOrder()}
            >
              Save media order
            </button>
            <a
              href="/admin/media"
              className="inline-block text-sm font-semibold text-gold-700 hover:underline"
            >
              Open media library →
            </a>
          </div>
        </section>
        <section className="rounded-xs border border-line bg-white p-6">
          <h2 className="font-serif text-2xl">Review moderation</h2>
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="border-b border-line pb-4 text-sm last:border-0"
              >
                <div className="flex justify-between gap-3">
                  <strong>{String(review.author_name)}</strong>
                  <span className="text-gold-700">
                    {String(review.rating)} ★
                  </span>
                </div>
                <p className="mt-1 text-ink-soft">{String(review.body)}</p>
                <div className="mt-2 flex justify-between gap-2">
                  <span className="text-xs uppercase text-muted">
                    {review.status}
                  </span>
                  <span className="flex gap-2">
                    {review.status !== "approved" ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-green-700"
                        onClick={() => void moderateReview(review, "approved")}
                      >
                        Approve
                      </button>
                    ) : null}
                    {review.status !== "rejected" ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-700"
                        onClick={() => void moderateReview(review, "rejected")}
                      >
                        Reject
                      </button>
                    ) : null}
                  </span>
                </div>
              </article>
            ))}
            {!reviews.length ? (
              <p className="text-sm text-muted">No customer reviews yet.</p>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}
