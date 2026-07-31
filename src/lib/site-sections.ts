/**
 * Every storefront image slot an administrator can override from
 * Admin → Media. The `key` is written to `media.section_key`; the storefront
 * reads it back through `/api/public/site-media`.
 *
 * This list is the single source of truth. The admin dropdown and the
 * storefront both read it, so a slot can never exist in one and not the other
 * — which is how a "managed" image ends up uploaded but never rendered.
 *
 * Adding a slot: add the entry here, then read it in the component with
 * `sectionImage(key, fallback)`. Never render a bare section image: every slot
 * keeps its bundled asset as a fallback so an empty CMS never blanks the page.
 */

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export interface SiteSection {
  /** Stored verbatim in `media.section_key`. Never rename an existing key. */
  key: string;
  label: string;
  /** Admin dropdown grouping. */
  group: string;
  /** Shown under the dropdown so an admin uploads the right shape. */
  hint: string;
  /** `video` slots accept mp4/webm; everything else expects a still image. */
  kind: "image" | "video";
  /**
   * How many published files this slot renders. Every current slot renders one
   * file; the field exists so a future carousel slot cannot be added without
   * the admin UI and the storefront agreeing on the count.
   */
  maxItems: number;
  allowedMimeTypes: readonly string[];
  maxBytes: number;
  /** Rejected below these, because upscaling a small file looks broken. */
  minWidth: number;
  minHeight: number;
  /** width / height. Enforced with a tolerance, not exactly. */
  aspectRatio?: number;
}

const MB = 1024 * 1024;

/** Allowed deviation from `aspectRatio` before an upload is rejected. */
export const ASPECT_RATIO_TOLERANCE = 0.15;

export const SITE_SECTIONS: SiteSection[] = [
  { key: "home.hero.poster", label: "Hero background image", group: "Homepage · Hero", hint: "Wide landscape, 1920×1080 or larger. Also used as the video poster.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 1600, minHeight: 900, aspectRatio: 16 / 9 },
  { key: "home.hero.video", label: "Hero background video", group: "Homepage · Hero", hint: "MP4 or WebM, muted loop, under 10 MB.", kind: "video" , maxItems: 1, allowedMimeTypes: VIDEO_MIME_TYPES, maxBytes: 10 * MB, minWidth: 1280, minHeight: 720, aspectRatio: 16 / 9 },

  { key: "home.collection.heritage-antique", label: "Featured tile · Heritage Antique", group: "Homepage · Featured collections", hint: "4:3 landscape.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 600, aspectRatio: 4 / 3 },
  { key: "home.collection.celeste-diamonds", label: "Featured tile · Celeste Diamonds", group: "Homepage · Featured collections", hint: "4:3 landscape.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 600, aspectRatio: 4 / 3 },
  { key: "home.collection.maharani-bridal", label: "Featured tile · Maharani Bridal", group: "Homepage · Featured collections", hint: "4:3 landscape.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 600, aspectRatio: 4 / 3 },
  { key: "home.collection.everyday-luxe", label: "Featured tile · Everyday Luxe", group: "Homepage · Featured collections", hint: "4:3 landscape.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 600, aspectRatio: 4 / 3 },
  { key: "home.collection.oxidised-heritage", label: "Featured tile · Oxidised Heritage", group: "Homepage · Featured collections", hint: "4:3 landscape.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 600, aspectRatio: 4 / 3 },

  { key: "home.gold-banner", label: "Gold Jewellery banner", group: "Homepage · Gold Jewellery", hint: "3:2 landscape, 1200×800 or larger.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 1200, minHeight: 800, aspectRatio: 3 / 2 },

  { key: "home.gallery.1", label: "Gallery strip · 1", group: "Homepage · Gallery strip", hint: "Square, 800×800.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 800, aspectRatio: 1 },
  { key: "home.gallery.2", label: "Gallery strip · 2", group: "Homepage · Gallery strip", hint: "Square, 800×800.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 800, aspectRatio: 1 },
  { key: "home.gallery.3", label: "Gallery strip · 3", group: "Homepage · Gallery strip", hint: "Square, 800×800.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 800, aspectRatio: 1 },
  { key: "home.gallery.4", label: "Gallery strip · 4", group: "Homepage · Gallery strip", hint: "Square, 800×800.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 800, aspectRatio: 1 },
  { key: "home.gallery.5", label: "Gallery strip · 5", group: "Homepage · Gallery strip", hint: "Square, 800×800.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 800, aspectRatio: 1 },
  { key: "home.gallery.6", label: "Gallery strip · 6", group: "Homepage · Gallery strip", hint: "Square, 800×800.", kind: "image" , maxItems: 1, allowedMimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * MB, minWidth: 800, minHeight: 800, aspectRatio: 1 },
];

export const SITE_SECTION_KEYS: string[] = SITE_SECTIONS.map((section) => section.key);

const SECTION_BY_KEY = new Map(SITE_SECTIONS.map((section) => [section.key, section]));

export function findSiteSection(key: string | null | undefined): SiteSection | undefined {
  return key ? SECTION_BY_KEY.get(key) : undefined;
}

/** Ordered `group → sections` for rendering a grouped `<select>`. */
export function siteSectionGroups(): Array<[string, SiteSection[]]> {
  const groups = new Map<string, SiteSection[]>();
  for (const section of SITE_SECTIONS) {
    const bucket = groups.get(section.group);
    if (bucket) bucket.push(section);
    else groups.set(section.group, [section]);
  }
  return [...groups.entries()];
}

/** What `/api/public/site-media` returns, keyed by `SiteSection.key`. */
export interface SectionMedia {
  url: string;
  alt: string;
  mimeType: string;
}

export type SectionMediaMap = Record<string, SectionMedia>;

export interface SectionUploadCandidate {
  mimeType: string;
  sizeBytes: number;
  /** Omit for video: the browser reads dimensions from the decoded frame. */
  width?: number;
  height?: number;
  /** First bytes of the file, used to verify the real format. */
  signature?: Uint8Array;
}

/**
 * One validation routine shared by the admin UI and the upload API, so the
 * browser can never accept something the server would reject (or vice versa).
 * Returns a human-readable reason, or null when the file is acceptable.
 */
export function validateSectionUpload(
  section: SiteSection,
  file: SectionUploadCandidate,
): string | null {
  if (!section.allowedMimeTypes.includes(file.mimeType))
    return `${section.label} accepts ${section.allowedMimeTypes.join(", ")}. This file is ${file.mimeType || "an unknown type"}.`;
  if (file.sizeBytes <= 0) return "The file is empty.";
  if (file.sizeBytes > section.maxBytes)
    return `Maximum size for ${section.label} is ${Math.round(section.maxBytes / (1024 * 1024))} MB. This file is ${(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB.`;
  // A renamed .exe still declares image/jpeg in the browser, so the declared
  // type is checked against the real leading bytes rather than the extension.
  if (file.signature && !signatureMatches(file.mimeType, file.signature))
    return "The file contents do not match its type. Re-export the image and try again.";
  if (file.width !== undefined && file.height !== undefined) {
    if (file.width < section.minWidth || file.height < section.minHeight)
      return `${section.label} needs at least ${section.minWidth}×${section.minHeight}px. This file is ${file.width}×${file.height}px.`;
    if (section.aspectRatio) {
      const ratio = file.width / file.height;
      const drift = Math.abs(ratio - section.aspectRatio) / section.aspectRatio;
      if (drift > ASPECT_RATIO_TOLERANCE)
        return `${section.label} expects roughly ${section.aspectRatio.toFixed(2)}:1. This file is ${ratio.toFixed(2)}:1 and would be cropped badly.`;
    }
  }
  return null;
}

/** Leading magic bytes per accepted format. */
export function signatureMatches(mimeType: string, bytes: Uint8Array): boolean {
  const at = (offset: number, expected: number[]) =>
    expected.every((byte, index) => bytes[offset + index] === byte);
  switch (mimeType) {
    case "image/jpeg":
      return at(0, [0xff, 0xd8, 0xff]);
    case "image/png":
      return at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // RIFF....WEBP
    case "image/webp":
      return at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]);
    // ISO-BMFF: "ftyp" at offset 4 for AVIF, MP4 and QuickTime alike.
    case "image/avif":
    case "video/mp4":
    case "video/quicktime":
      return at(4, [0x66, 0x74, 0x79, 0x70]);
    // EBML header.
    case "video/webm":
      return at(0, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}
