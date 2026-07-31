"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SITE_SECTIONS,
  siteSectionGroups,
  validateSectionUpload,
  type SiteSection,
} from "@/src/lib/site-sections";

interface MediaItem {
  id: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  title: string;
  alt_text: string;
  section_key: string | null;
  is_active: boolean;
  created_at: string;
  public_url: string | null;
  product_links: Array<{ product_id: string }>;
}

type SlotState = "idle" | "validating" | "uploading" | "saving";

/** Reads intrinsic dimensions without uploading anything. */
async function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("video/")) {
      return await new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
        video.onerror = () => resolve(null);
        video.src = url;
      });
    }
    return await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readSignature(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, 16).arrayBuffer());
}

export default function SectionGallery() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotState, setSlotState] = useState<Record<string, SlotState>>({});
  const [slotError, setSlotError] = useState<Record<string, string>>({});
  const [slotNotice, setSlotNotice] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Record<string, { url: string; name: string }>>({});
  const previewUrls = useRef<string[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/media", { cache: "no-store" });
    const payload = (await response.json()) as { data?: MediaItem[]; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message ?? "Website images could not be loaded");
    setItems(payload.data ?? []);
  }, []);

  useEffect(() => {
    void load()
      .catch((error: unknown) =>
        setLoadError(error instanceof Error ? error.message : "Website images could not be loaded"),
      )
      .finally(() => setLoading(false));
  }, [load]);

  // Object URLs for local previews are revoked on unmount; without this every
  // re-selected file leaks a blob for the lifetime of the tab.
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // Newest first, matching /api/public/site-media exactly. The admin list is
  // ordered by display_order first, so without this re-sort a slot holding two
  // active rows could show one image here and render a different one on the
  // website.
  const publishedFor = (section: SiteSection) =>
    items
      .filter((item) => item.section_key === section.key && item.is_active)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  function setState(key: string, state: SlotState) {
    setSlotState((current) => ({ ...current, [key]: state }));
  }

  function setError(key: string, message: string) {
    setSlotError((current) => ({ ...current, [key]: message }));
  }

  function clearMessages(key: string) {
    setSlotError((current) => ({ ...current, [key]: "" }));
    setSlotNotice((current) => ({ ...current, [key]: "" }));
  }

  async function chooseFile(section: SiteSection, file: File) {
    clearMessages(section.key);
    setState(section.key, "validating");
    try {
      const [dimensions, signature] = await Promise.all([readDimensions(file), readSignature(file)]);
      if (!dimensions) {
        setError(section.key, "That file could not be read as an image or video. It may be corrupt.");
        return;
      }
      const problem = validateSectionUpload(section, {
        mimeType: file.type,
        sizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        signature,
      });
      if (problem) {
        setError(section.key, problem);
        return;
      }
      const url = URL.createObjectURL(file);
      previewUrls.current.push(url);
      setPreview((current) => ({ ...current, [section.key]: { url, name: file.name } }));
      await publish(section, file);
    } finally {
      setState(section.key, "idle");
    }
  }

  /**
   * Replace is atomic from the visitor's point of view: the API registers the
   * new file against the section and stands the previous one down in the same
   * request, in that order. The section is never empty mid-replacement, and a
   * dropped connection here cannot leave two rows assigned to one slot. The old
   * record is only unassigned, never deleted, so shared media stays intact.
   */
  async function publish(section: SiteSection, file: File) {
    setState(section.key, "uploading");
    try {
      const presignResponse = await fetch("/api/admin/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, fileSize: file.size, sectionKey: section.key }),
      });
      const presign = (await presignResponse.json()) as {
        uploadUrl?: string;
        objectKey?: string;
        error?: { message: string };
      };
      if (!presignResponse.ok || !presign.uploadUrl || !presign.objectKey)
        throw new Error(presign.error?.message ?? "Upload could not be started");

      const upload = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error("The file could not be stored. Check your connection and try again.");

      setState(section.key, "saving");
      const register = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey: presign.objectKey,
          originalFilename: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
          title: section.label,
          altText: "",
          sectionKey: section.key,
          productId: null,
        }),
      });
      const registered = (await register.json()) as {
        error?: { message: string };
        warning?: { message: string };
      };
      if (!register.ok)
        throw new Error(registered.error?.message ?? "The image was stored but could not be published");

      // A warning means the new image IS live; only the previous assignment
      // could not be cleared. Say so plainly instead of claiming success.
      if (registered.warning) setError(section.key, registered.warning.message);
      else
        setSlotNotice((current) => ({
          ...current,
          [section.key]: "Published. The website updates within a minute.",
        }));
      await load();
    } catch (error) {
      setError(section.key, error instanceof Error ? error.message : "Publishing failed");
    }
  }

  async function saveAltText(item: MediaItem, value: string) {
    const response = await fetch("/api/admin/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, altText: value }),
    });
    if (!response.ok) setError(item.section_key ?? "", "The description could not be saved.");
    else await load();
  }

  /**
   * Removal unassigns the section and leaves the file in the library. Deleting
   * the asset here would break any product or other section still using it.
   */
  async function removeFromSection(section: SiteSection, item: MediaItem) {
    if (!window.confirm(`Remove this image from “${section.label}”? The section returns to the built-in picture.`))
      return;
    clearMessages(section.key);
    setState(section.key, "saving");
    try {
      const response = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, sectionKey: null }),
      });
      if (!response.ok) throw new Error("The image could not be removed from this section.");
      setSlotNotice((current) => ({
        ...current,
        [section.key]: "Removed. This section is back to its built-in picture.",
      }));
      await load();
    } catch (error) {
      setError(section.key, error instanceof Error ? error.message : "Removal failed");
    } finally {
      setState(section.key, "idle");
    }
  }

  if (loading)
    return (
      <p className="mt-8 text-sm text-ink-soft" role="status">
        Loading website images…
      </p>
    );

  if (loadError)
    return (
      <p className="mt-8 rounded-xs border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {loadError}
      </p>
    );

  return (
    <div className="mt-8 grid gap-10">
      <p className="text-sm text-ink-soft">
        {items.filter((item) => item.section_key && item.is_active).length} of {SITE_SECTIONS.length} sections use a
        custom image.
      </p>
      {siteSectionGroups().map(([group, sections]) => (
        <section key={group}>
          <h2 className="font-serif text-2xl">{group}</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sections.map((section) => {
              const published = publishedFor(section);
              const state = slotState[section.key] ?? "idle";
              const busy = state !== "idle";
              const localPreview = preview[section.key];
              return (
                <article key={section.key} className="flex flex-col rounded-xs border border-line bg-white">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream">
                    {published[0]?.public_url && published[0].mime_type.startsWith("video/") ? (
                      <video className="h-full w-full object-contain" src={published[0].public_url} controls preload="metadata" />
                    ) : published[0]?.public_url ? (
                      <img
                        className="h-full w-full object-contain"
                        src={published[0].public_url}
                        alt={published[0].alt_text || section.label}
                      />
                    ) : localPreview ? (
                      <img className="h-full w-full object-contain opacity-60" src={localPreview.url} alt="" />
                    ) : (
                      <div className="grid h-full place-items-center px-4 text-center text-sm text-muted">
                        No custom image. The website shows its built-in picture for this section.
                      </div>
                    )}
                    {busy ? (
                      <p
                        className="absolute inset-x-0 bottom-0 bg-ink/85 py-2 text-center text-xs font-semibold text-white"
                        role="status"
                      >
                        {state === "validating" ? "Checking file…" : state === "uploading" ? "Uploading…" : "Publishing…"}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <h3 className="font-serif text-lg leading-snug">{section.label}</h3>
                      <p className="mt-1 text-xs text-ink-soft">{section.hint}</p>
                      <p className="mt-1 text-xs text-muted">
                        Minimum {section.minWidth}×{section.minHeight}px · up to{" "}
                        {Math.round(section.maxBytes / (1024 * 1024))} MB ·{" "}
                        {section.allowedMimeTypes.map((type) => type.split("/")[1]?.toUpperCase()).join(", ")}
                      </p>
                    </div>

                    {published[0] ? (
                      <label className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                        Image description
                        <input
                          className="mt-1 min-h-11 w-full border border-line px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink"
                          defaultValue={published[0].alt_text}
                          placeholder="Describes the picture for screen readers"
                          onBlur={(event) => {
                            if (event.target.value !== published[0].alt_text)
                              void saveAltText(published[0], event.target.value);
                          }}
                        />
                      </label>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xs bg-ink px-4 text-sm font-semibold text-white hover:bg-gold-500 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-500">
                        {published[0] ? "Replace image" : "Upload image"}
                        <input
                          className="sr-only"
                          type="file"
                          accept={section.allowedMimeTypes.join(",")}
                          disabled={busy}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void chooseFile(section, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {published[0] ? (
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
                          disabled={busy}
                          onClick={() => void removeFromSection(section, published[0])}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    {slotError[section.key] ? (
                      <p role="alert" className="rounded-xs border border-red-200 bg-red-50 p-2 text-xs leading-5 text-red-800">
                        {slotError[section.key]}
                      </p>
                    ) : null}
                    {slotNotice[section.key] ? (
                      <p role="status" className="rounded-xs border border-green-200 bg-green-50 p-2 text-xs leading-5 text-green-800">
                        {slotNotice[section.key]}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
