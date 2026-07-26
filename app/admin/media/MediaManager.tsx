"use client";

import { useEffect, useState } from "react";

const ACCEPTED_MEDIA =
  "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime";
const MEDIA_PAGE_SIZE = 24;

interface ProductLink {
  product_id: string;
  role: string;
  display_order: number;
  products: { id: string; name: string; sku: string; status: string } | null;
}

interface MediaItem {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  title: string;
  alt_text: string;
  caption: string;
  section_key: string | null;
  review_status: "pending" | "approved" | "rejected";
  is_active: boolean;
  public_url: string | null;
  product_links: ProductLink[];
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}
interface LocalMediaItem {
  id: string;
  filename: string;
  public_url: string;
  mime_type: string;
  source: "bundled";
}

function publicationLabel(item: MediaItem) {
  if (
    item.is_active &&
    item.product_links.some((link) => link.products?.status === "published")
  )
    return "Published product";
  if (item.product_links.length) return "Linked product · draft";
  if (item.section_key && item.is_active)
    return `Live site gallery · ${item.section_key}`;
  return "Uploaded · not published";
}

function publicationClass(item: MediaItem) {
  return (item.is_active &&
    item.product_links.some((link) => link.products?.status === "published")) ||
    (item.section_key && item.is_active)
    ? "bg-green-100 text-green-800"
    : "bg-cream text-ink-soft";
}

export default function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [localItems, setLocalItems] = useState<LocalMediaItem[]>([]);
  const [localError, setLocalError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [productId, setProductId] = useState("");
  const [role, setRole] = useState("gallery");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/media", { cache: "no-store" });
    const payload = (await response.json()) as {
      data?: MediaItem[];
      error?: { message: string };
    };
    if (!response.ok)
      throw new Error(payload.error?.message ?? "Media could not be loaded");
    setItems(payload.data ?? []);
  }

  useEffect(() => {
    void load().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : "Media could not be loaded",
      ),
    );
    void fetch("/api/admin/media/local", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: LocalMediaItem[];
          error?: { message?: string };
        };
        if (!response.ok)
          throw new Error(
            payload.error?.message ?? "Bundled media could not be loaded",
          );
        setLocalItems(payload.data ?? []);
        setLocalError("");
      })
      .catch((error: unknown) =>
        setLocalError(
          error instanceof Error
            ? error.message
            : "Bundled media could not be loaded",
        ),
      );
    void fetch("/api/admin/products", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: ProductOption[] }) =>
        setProducts(payload.data ?? []),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(items.length / MEDIA_PAGE_SIZE))),
    );
  }, [items.length]);

  async function syncD1() {
    await fetch("/api/admin/d1-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const uploadDetails = {
        contentType: file.type,
        fileSize: file.size,
        ...(productId ? { productId } : {}),
      };
      const presignResponse = await fetch("/api/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadDetails),
      });
      const presign = (await presignResponse.json()) as {
        uploadUrl?: string;
        objectKey?: string;
        error?: { message: string };
      };
      if (!presignResponse.ok || !presign.uploadUrl || !presign.objectKey)
        throw new Error(
          presign.error?.message ?? "Upload URL could not be created",
        );
      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Cloudflare R2 upload failed");
      const registerResponse = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey: presign.objectKey,
          originalFilename: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          title,
          altText,
          productId: productId || null,
          role,
        }),
      });
      const registered = (await registerResponse.json()) as {
        error?: { message: string };
      };
      if (!registerResponse.ok)
        throw new Error(
          registered.error?.message ?? "Media metadata could not be saved",
        );
      setFile(null);
      setTitle("");
      setAltText("");
      setRole("gallery");
      setMessage("Media uploaded and synchronized.");
      await syncD1();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function replaceFile(item: MediaItem, replacement: File) {
    setReplacingId(item.id);
    setMessage("");
    try {
      const presignResponse = await fetch("/api/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: item.id,
          contentType: replacement.type,
          fileSize: replacement.size,
        }),
      });
      const presign = (await presignResponse.json()) as {
        uploadUrl?: string;
        objectKey?: string;
        error?: { message: string };
      };
      if (!presignResponse.ok || !presign.uploadUrl || !presign.objectKey)
        throw new Error(
          presign.error?.message ?? "Replacement URL could not be created",
        );
      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": replacement.type },
        body: replacement,
      });
      if (!uploadResponse.ok)
        throw new Error("Cloudflare R2 replacement failed");
      const updateResponse = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          storageKey: presign.objectKey,
          originalFilename: replacement.name,
          mimeType: replacement.type,
          fileSizeBytes: replacement.size,
        }),
      });
      const updated = (await updateResponse.json()) as {
        error?: { message: string };
      };
      if (!updateResponse.ok)
        throw new Error(
          updated.error?.message ?? "Media record could not be updated",
        );
      setMessage(
        `${item.original_filename} replaced. Existing publication links were preserved.`,
      );
      await syncD1();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Replacement failed");
    } finally {
      setReplacingId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this media from the live catalogue?")) return;
    const response = await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
      await syncD1();
    } else
      setMessage(
        ((await response.json()) as { error?: { message?: string } }).error
          ?.message ?? "Media could not be deleted.",
      );
  }

  async function edit(
    id: string,
    field: "title" | "altText" | "reviewStatus",
    value: string,
  ) {
    const response = await fetch("/api/admin/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    if (!response.ok) setMessage("Media metadata could not be updated.");
    else await syncD1();
  }

  const pageCount = Math.max(1, Math.ceil(items.length / MEDIA_PAGE_SIZE));
  const visibleItems = items.slice(
    (page - 1) * MEDIA_PAGE_SIZE,
    page * MEDIA_PAGE_SIZE,
  );
  const registeredKeys = new Set(
    items.map(
      (item) =>
        `site/bundled/${item.storage_key.replace(/^site\/bundled\//, "")}`,
    ),
  );
  const unregisteredLocalItems = localItems.filter(
    (item) =>
      !registeredKeys.has(
        `site/bundled/${item.id.slice("bundled:".length).replaceAll("\\", "/")}`,
      ),
  );

  return (
    <section className="mt-8">
      <div className="mb-5 rounded-xs border border-line bg-white p-5">
        <h2 className="font-serif text-2xl">Live media gallery</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Published product media and active site-gallery media appear here.
          Replace a file to update the live R2 asset while preserving its
          existing links.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          className="h-fit rounded-xs border border-line bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void upload();
          }}
        >
          <h2 className="font-serif text-2xl">Add media</h2>
          <label className="mt-5 block text-sm font-medium">
            File
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept={ACCEPTED_MEDIA}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Product
            <select
              className="mt-2 w-full border border-line p-2"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="">Site media (not product-linked)</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.sku}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium">
            Product media role
            <select
              className="mt-2 w-full border border-line p-2"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="primary">Primary image</option>
              <option value="gallery">Gallery image</option>
              <option value="hover">Hover image</option>
              <option value="spin">Spin media</option>
              <option value="certificate">Certificate</option>
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium">
            Title
            <input
              className="mt-2 w-full border border-line p-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Alt text
            <input
              className="mt-2 w-full border border-line p-2"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
            />
          </label>
          <button
            className="mt-5 w-full bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!file || busy}
          >
            {busy ? "Uploading…" : "Upload to R2"}
          </button>
          {message ? (
            <p className="mt-4 text-sm text-ink-soft" role="status">
              {message}
            </p>
          ) : null}
        </form>
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl">Registered live media</h2>
              <p className="mt-1 text-sm text-ink-soft">
                R2 media with editable metadata, publication links, and
                replacement controls.
              </p>
            </div>
            <span className="text-sm text-muted">
              {items.length} item{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xs border border-line bg-white"
              >
                {item.public_url && item.mime_type.startsWith("video/") ? (
                  <video
                    className="aspect-[4/3] w-full bg-black object-contain"
                    src={item.public_url}
                    controls
                    preload="metadata"
                  />
                ) : item.public_url ? (
                  <img
                    loading="lazy"
                    className="aspect-[4/3] w-full bg-cream object-contain"
                    src={item.public_url}
                    alt={item.alt_text || item.title || item.original_filename}
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-cream text-sm text-muted">
                    R2 public URL not configured
                  </div>
                )}
                <div className="p-4">
                  <div
                    className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${publicationClass(item)}`}
                  >
                    {publicationLabel(item)}
                  </div>
                  {item.product_links.map((link) => (
                    <p
                      key={`${item.id}-${link.product_id}`}
                      className="mb-2 text-xs text-ink-soft"
                    >
                      {link.products?.name ?? "Product"} · {link.role}
                    </p>
                  ))}
                  <input
                    className="w-full border border-line p-2 text-sm"
                    defaultValue={item.title}
                    aria-label={`Title for ${item.original_filename}`}
                    onBlur={(event) => {
                      if (event.target.value !== item.title)
                        void edit(item.id, "title", event.target.value);
                    }}
                  />
                  <select
                    className="mt-2 w-full border border-line p-2 text-sm"
                    defaultValue={item.review_status}
                    aria-label={`Review status for ${item.original_filename}`}
                    onChange={(event) =>
                      void edit(item.id, "reviewStatus", event.target.value)
                    }
                  >
                    <option value="pending">Pending review</option>
                    <option value="approved">Approved for public use</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input
                    className="mt-2 w-full border border-line p-2 text-sm"
                    defaultValue={item.alt_text}
                    aria-label={`Alt text for ${item.original_filename}`}
                    onBlur={(event) => {
                      if (event.target.value !== item.alt_text)
                        void edit(item.id, "altText", event.target.value);
                    }}
                  />
                  <p className="mt-2 text-xs text-muted">
                    {item.mime_type} · {Math.ceil(item.file_size_bytes / 1024)}{" "}
                    KB
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <a
                      className="font-semibold text-gold-700 hover:underline"
                      href={item.public_url ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open full size
                    </a>
                    <label className="cursor-pointer font-semibold text-gold-700 hover:underline">
                      {replacingId === item.id
                        ? "Replacing…"
                        : "Replace image/video"}
                      <input
                        className="sr-only"
                        type="file"
                        accept={ACCEPTED_MEDIA}
                        disabled={replacingId !== null}
                        onChange={(event) => {
                          const replacement = event.target.files?.[0];
                          if (replacement) void replaceFile(item, replacement);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <button
                    className="mt-3 block text-sm text-red-700 hover:underline"
                    onClick={() => void remove(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {!items.length ? (
              <p className="text-sm text-muted">No registered R2 media yet.</p>
            ) : null}
          </div>
          {items.length > 0 ? (
            <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
              <button
                className="rounded-xs border border-line px-3 py-2 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span className="text-muted">
                Page {page} of {pageCount} · {items.length} total
              </span>
              <button
                className="rounded-xs border border-line px-3 py-2 disabled:opacity-40"
                disabled={page === pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
          <div className="mt-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl">Storefront assets</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Unregistered images and videos shipped with this website.
                R2-managed assets appear above.
              </p>
            </div>
            <span className="text-sm text-muted">
              {unregisteredLocalItems.length} asset
              {unregisteredLocalItems.length === 1 ? "" : "s"}
            </span>
          </div>
          {localError ? (
            <p
              className="mt-4 rounded-xs border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              {localError}
            </p>
          ) : null}
          <div className="mt-4 grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
            {unregisteredLocalItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xs border border-line bg-white"
              >
                <div className="relative">
                  {item.mime_type.startsWith("video/") ? (
                    <video
                      className="aspect-[4/3] w-full bg-black object-contain"
                      src={item.public_url}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-cream object-contain"
                      src={item.public_url}
                      alt={item.filename}
                    />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink">
                    Bundled
                  </span>
                </div>
                <div className="p-4">
                  <p
                    className="truncate text-sm font-medium"
                    title={item.filename}
                  >
                    {item.filename}
                  </p>
                  <p className="mt-1 text-xs text-muted">{item.mime_type}</p>
                  <a
                    className="mt-3 inline-block text-sm font-semibold text-gold-700 hover:underline"
                    href={item.public_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open full size
                  </a>
                </div>
              </article>
            ))}
            {!localError && !unregisteredLocalItems.length ? (
              <p className="text-sm text-muted">
                All bundled storefront assets are already managed in R2.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
