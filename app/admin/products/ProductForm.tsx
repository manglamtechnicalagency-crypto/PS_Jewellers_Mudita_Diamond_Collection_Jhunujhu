"use client";

import { useEffect, useMemo, useState } from "react";
import { isProductVideo, validateProductMediaSelection } from "@/src/lib/product-media-policy";

type MediaRole = "primary" | "gallery" | "hover" | "spin" | "certificate";
type Category = { id: string; kind: string; name: string };
type SelectedMedia = { file: File; role: MediaRole };

const ACCEPTED_MEDIA_TYPES = "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);
}

function getVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    video.src = url;
  });
}

export default function ProductForm({ mode = "create", productId, initialProduct }: { mode?: "create" | "edit"; productId?: string; initialProduct?: Record<string, unknown> }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: String(initialProduct?.name ?? ""), categoryId: String(initialProduct?.category_id ?? ""), shortDescription: String(initialProduct?.short_description ?? ""), longDescription: String(initialProduct?.long_description ?? ""), metalType: String(initialProduct?.metal_type ?? ""), metalPurity: String(initialProduct?.metal_purity ?? ""), metalWeightGrams: String(initialProduct?.metal_weight_grams ?? ""), grossWeightGrams: String(initialProduct?.gross_weight_grams ?? ""), netWeightGrams: String(initialProduct?.net_weight_grams ?? ""), stoneType: String(initialProduct?.stone_type ?? ""), stoneCarat: String(initialProduct?.stone_carat ?? ""), stoneClarity: String(initialProduct?.stone_clarity ?? ""), stoneColour: String(initialProduct?.stone_colour ?? ""), stoneCount: String(initialProduct?.stone_count ?? ""), certification: String(initialProduct?.certification ?? ""), certificateNumber: String(initialProduct?.certificate_number ?? ""), hallmarkCode: String(initialProduct?.hallmark_code ?? ""), priceMode: String(initialProduct?.price_mode ?? "on_request"), basePrice: String(initialProduct?.base_price ?? ""), makingCharges: String(initialProduct?.making_charges ?? "0"), wastagePercent: String(initialProduct?.wastage_percent ?? "0"), gstPercent: String(initialProduct?.gst_percent ?? "3"), discountType: String(initialProduct?.discount_type ?? ""), discountValue: String(initialProduct?.discount_value ?? ""), stockQuantity: String(initialProduct?.stock_quantity ?? "0"), stockStatus: String(initialProduct?.stock_status ?? "in_stock"), status: String(initialProduct?.status ?? "published") });
  const [careInstructions, setCareInstructions] = useState(String(initialProduct?.care_instructions ?? ""));
  const [mediaFiles, setMediaFiles] = useState<SelectedMedia[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const previews = useMemo(() => mediaFiles.map((media) => ({ ...media, url: URL.createObjectURL(media.file) })), [mediaFiles]);
  useEffect(() => () => previews.forEach((media) => URL.revokeObjectURL(media.url)), [previews]);
  useEffect(() => { void fetch("/api/admin/taxonomy", { cache: "no-store" }).then((response) => response.json()).then((payload: { data?: Category[] }) => setCategories((payload.data ?? []).filter((item) => item.kind === "category"))).catch(() => undefined); }, []);

  function setField(key: string, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function chooseFiles(files: File[]) {
    const candidates = await Promise.all(files.map(async (file) => ({ name: file.name, type: file.type, size: file.size, duration: isProductVideo(file.type) ? await getVideoDuration(file) : undefined })));
    const validation = validateProductMediaSelection(candidates, mediaFiles.map(({ file }) => ({ name: file.name, type: file.type, size: file.size })));
    if (!validation.valid) { setMessage(validation.message ?? "Product media is invalid."); return; }
    setMediaFiles((current) => [...current, ...files.map((file, index) => ({ file, role: !current.some((item) => item.role === "primary") && index === 0 && file.type.startsWith("image/") ? "primary" as MediaRole : file.type.startsWith("video/") ? "spin" as MediaRole : "gallery" as MediaRole }))]);
  }

  function setRole(index: number, role: MediaRole) { setMediaFiles((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role } : role === "primary" && item.role === "primary" ? { ...item, role: "gallery" } : item)); }
  function reorderMedia(targetIndex: number) { if (dragIndex === null || dragIndex === targetIndex) return; setMediaFiles((current) => { const next = [...current]; const [moved] = next.splice(dragIndex, 1); next.splice(targetIndex, 0, moved); return next; }); setDragIndex(null); }
  function handleFileDrop(event: React.DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragActive(false); void chooseFiles(Array.from(event.dataTransfer.files)); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const numberValue = (value: string) => value.trim() === "" ? null : Number(value);
      const body = { slug: mode === "edit" ? undefined : `${slugify(form.name) || "product"}-${Date.now().toString(36)}`, name: form.name.trim() || "Untitled product", shortDescription: form.shortDescription, longDescription: form.longDescription, careInstructions, categoryId: form.categoryId || categories[0]?.id, metalType: form.metalType, metalPurity: form.metalPurity, metalWeightGrams: numberValue(form.metalWeightGrams), grossWeightGrams: numberValue(form.grossWeightGrams), netWeightGrams: numberValue(form.netWeightGrams), stoneType: form.stoneType, stoneCarat: numberValue(form.stoneCarat), stoneClarity: form.stoneClarity, stoneColour: form.stoneColour, stoneCount: numberValue(form.stoneCount), certification: form.certification, certificateNumber: form.certificateNumber, hallmarkCode: form.hallmarkCode, priceMode: form.priceMode, basePrice: form.priceMode === "on_request" ? null : Number(form.basePrice || 0), makingCharges: Number(form.makingCharges || 0), wastagePercent: Number(form.wastagePercent || 0), gstPercent: Number(form.gstPercent || 0), discountType: form.discountType || null, discountValue: form.discountValue ? Number(form.discountValue) : 0, stockQuantity: Number(form.stockQuantity || 0), stockStatus: form.stockStatus, status: form.status === "published" ? "draft" : form.status };
      const response = await fetch(mode === "create" ? "/api/admin/products" : `/api/admin/products/${productId}`, { method: mode === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { data?: { id: string }; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Product could not be saved");
      const id = payload.data.id;
      for (const [index, media] of mediaFiles.entries()) {
        const uploadForm = new FormData(); uploadForm.set("file", media.file); uploadForm.set("productId", id); uploadForm.set("role", media.role); uploadForm.set("displayOrder", String(index)); uploadForm.set("title", form.name); uploadForm.set("altText", form.name);
        const uploadResponse = await fetch("/api/admin/media/upload", { method: "POST", body: uploadForm });
        const uploaded = await uploadResponse.json() as { error?: { message?: string } };
        if (!uploadResponse.ok) throw new Error(uploaded.error?.message ?? "Media upload failed");
      }
      if (form.status === "published") {
        const publishResponse = await fetch(`/api/admin/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "published", shortDescription: form.shortDescription, longDescription: form.longDescription, priceMode: form.priceMode, basePrice: form.priceMode === "on_request" ? null : Number(form.basePrice) }) });
        if (!publishResponse.ok) { const publish = await publishResponse.json() as { error?: { message?: string } }; throw new Error(publish.error?.message ?? "Product could not be published"); }
      }
      setMessage(mode === "create" ? "Product created successfully." : "Product saved successfully.");
      if (mode === "create") { window.location.assign("/admin/products"); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Product could not be saved"); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="mt-8 grid gap-6 rounded-xs border border-line bg-white p-6">
    <h2 className="font-serif text-2xl">{mode === "create" ? "Add product" : "Edit product"}</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Product name<input className="mt-1 w-full border border-line p-3" value={form.name} onChange={(event) => setField("name", event.target.value)} /></label>
      <label className="text-sm font-medium">Category<select className="mt-1 w-full border border-line p-3" value={form.categoryId} onChange={(event) => setField("categoryId", event.target.value)}><option value="">Select</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="text-sm font-medium sm:col-span-2">Short description<textarea className="mt-1 min-h-24 w-full border border-line p-3" value={form.shortDescription} onChange={(event) => setField("shortDescription", event.target.value)} /></label>
      <label className="text-sm font-medium sm:col-span-2">Long description<textarea className="mt-1 min-h-24 w-full border border-line p-3" value={form.longDescription} onChange={(event) => setField("longDescription", event.target.value)} /></label>
      <label className="text-sm font-medium sm:col-span-2">Care instructions <span className="font-normal text-muted">(optional; one instruction per line)</span><textarea className="mt-1 min-h-24 w-full border border-line p-3" value={careInstructions} onChange={(event) => setCareInstructions(event.target.value)} placeholder="Store in a soft pouch&#10;Keep away from chemicals and moisture" /></label>
    </div>
    <section className="grid gap-4 rounded-xs border border-line bg-white p-4 sm:grid-cols-2"><h3 className="font-serif text-xl sm:col-span-2">Jewellery details</h3>{([["metalType", "Metal type"], ["metalPurity", "Metal purity"], ["metalWeightGrams", "Metal weight (g)"], ["grossWeightGrams", "Gross weight (g)"], ["netWeightGrams", "Net weight (g)"], ["stoneType", "Stone type"], ["stoneCarat", "Stone carat"], ["stoneClarity", "Stone clarity"], ["stoneColour", "Stone colour"], ["stoneCount", "Stone count"], ["certification", "Certification"], ["certificateNumber", "Certificate number"], ["hallmarkCode", "Hallmark code"]] as const).map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<input className="mt-1 w-full border border-line p-3" type={key.includes("Weight") || key.includes("Carat") || key.includes("Count") ? "number" : "text"} step="0.001" min="0" value={form[key]} onChange={(event) => setField(key, event.target.value)} /></label>)}</section>
    <section className="grid gap-4 rounded-xs border border-line bg-cream p-4 sm:grid-cols-2"><h3 className="font-serif text-xl sm:col-span-2">Pricing, stock, and offer</h3><label className="text-sm font-medium">Pricing mode<select className="mt-1 w-full border border-line bg-white p-3" value={form.priceMode} onChange={(event) => setField("priceMode", event.target.value)}><option value="on_request">Price on request</option><option value="fixed">Fixed price</option><option value="weight_based">Weight-based</option></select></label><label className="text-sm font-medium">Regular price<input className="mt-1 w-full border border-line bg-white p-3" type="number" min="0" step="0.01" value={form.basePrice} onChange={(event) => setField("basePrice", event.target.value)} disabled={form.priceMode === "on_request"} /></label><label className="text-sm font-medium">Making charges<input className="mt-1 w-full border border-line bg-white p-3" type="number" min="0" step="0.01" value={form.makingCharges} onChange={(event) => setField("makingCharges", event.target.value)} /></label><label className="text-sm font-medium">Wastage %<input className="mt-1 w-full border border-line bg-white p-3" type="number" min="0" step="0.01" value={form.wastagePercent} onChange={(event) => setField("wastagePercent", event.target.value)} /></label><label className="text-sm font-medium">GST %<input className="mt-1 w-full border border-line bg-white p-3" type="number" min="0" step="0.01" value={form.gstPercent} onChange={(event) => setField("gstPercent", event.target.value)} /></label><label className="text-sm font-medium">Stock quantity<input className="mt-1 w-full border border-line bg-white p-3" type="number" min="0" value={form.stockQuantity} onChange={(event) => setField("stockQuantity", event.target.value)} /></label><label className="text-sm font-medium">Stock status<select className="mt-1 w-full border border-line bg-white p-3" value={form.stockStatus} onChange={(event) => setField("stockStatus", event.target.value)}><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option><option value="made_to_order">Made to order</option></select></label><label className="text-sm font-medium">Offer type<select className="mt-1 w-full border border-line bg-white p-3" value={form.discountType} onChange={(event) => setField("discountType", event.target.value)}><option value="">No offer</option><option value="flat">Fixed amount</option><option value="percentage">Percentage</option></select></label><label className="text-sm font-medium">Offer value<input className="mt-1 w-full border border-line bg-white p-3" type="number" min="0" step="0.01" value={form.discountValue} onChange={(event) => setField("discountValue", event.target.value)} disabled={!form.discountType} /></label><label className="text-sm font-medium">Publishing status<select className="mt-1 w-full border border-line bg-white p-3" value={form.status} onChange={(event) => setField("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></section>
    <section className="grid gap-3"><h3 className="font-serif text-xl">Product media</h3><p className="text-sm text-muted">Maximum 5 files: up to 5 images, or 4 images and 1 video. Images up to 3 MB; video up to 30 MB and 10–12 seconds.</p><label className={`grid cursor-pointer place-items-center rounded-xs border border-dashed p-6 text-center text-sm transition ${dragActive ? "border-gold bg-cream" : "border-line bg-white"}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }} onDrop={handleFileDrop}><span>{dragActive ? "Drop media files here" : "Drag and drop images or video here, or click to browse"}</span><input className="sr-only" type="file" accept={ACCEPTED_MEDIA_TYPES} multiple onChange={(event) => { void chooseFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>{previews.map((media, index) => <div key={`${media.file.name}-${index}`} className="flex items-center gap-3 border border-line bg-cream p-2 text-sm" draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderMedia(index)}><span>{index + 1}</span><div className="h-14 w-14 overflow-hidden bg-white">{media.file.type.startsWith("video/") ? <video src={media.url} className="h-full w-full object-cover" muted /> : <img src={media.url} alt={media.file.name} className="h-full w-full object-cover" />}</div><span className="min-w-0 flex-1 truncate">{media.file.name}</span><select className="border border-line bg-white p-2" value={media.role} onChange={(event) => setRole(index, event.target.value as MediaRole)}><option value="primary">Primary</option><option value="gallery">Gallery</option><option value="hover">Hover</option><option value="spin">Spin/video</option><option value="certificate">Certificate</option></select><button type="button" className="text-red-700" onClick={() => setMediaFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}</section>
    <button disabled={busy} className="bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving product…" : mode === "create" ? "Create product" : "Save product"}</button>{message ? <p className="text-sm text-ink-soft" role="status">{message}</p> : null}
  </form>;
}
