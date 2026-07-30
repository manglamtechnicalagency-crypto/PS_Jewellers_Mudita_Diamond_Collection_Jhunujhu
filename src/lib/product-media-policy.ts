export const MAX_PRODUCT_MEDIA = 5;
export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_VIDEOS = 1;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export const MIN_VIDEO_DURATION_SECONDS = 10;
export const MAX_VIDEO_DURATION_SECONDS = 12;

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export interface ProductMediaCandidate {
  name?: string;
  type: string;
  size?: number;
  duration?: number;
}

export interface ProductMediaPolicyResult {
  valid: boolean;
  message?: string;
}

export function isProductImage(type: string) {
  return imageTypes.has(type.toLowerCase());
}

export function isProductVideo(type: string) {
  return videoTypes.has(type.toLowerCase());
}

export function validateProductMediaSelection(
  incoming: ProductMediaCandidate[],
  existing: ProductMediaCandidate[] = [],
): ProductMediaPolicyResult {
  const files = [...existing, ...incoming];
  if (files.length > MAX_PRODUCT_MEDIA) return { valid: false, message: "You can upload a maximum of 5 media files per product." };

  const videos = files.filter((file) => isProductVideo(file.type));
  if (videos.length > MAX_PRODUCT_VIDEOS) return { valid: false, message: "Only one video is allowed per product." };
  if (files.some((file) => !isProductImage(file.type) && !isProductVideo(file.type))) return { valid: false, message: "Supported image formats: JPG, JPEG, PNG and WebP. Supported video formats: MP4, MOV and WebM." };
  if (incoming.some((file) => isProductImage(file.type) && (file.size === undefined || file.size <= 0 || file.size > MAX_IMAGE_BYTES))) return { valid: false, message: "Each image must be 3 MB or smaller." };
  if (incoming.some((file) => isProductVideo(file.type) && (file.size === undefined || file.size <= 0 || file.size > MAX_VIDEO_BYTES))) return { valid: false, message: "The video must be 30 MB or smaller." };
  // Duration is only knowable where the media can be decoded — the browser, or a
  // server that probes the file. Callers that cannot measure it omit it, and this
  // check skips rather than rejects; treating "unknown" as "invalid" made every
  // server-side video upload fail. Whenever a duration IS supplied it is enforced.
  if (incoming.some((file) => isProductVideo(file.type) && file.duration !== undefined && (file.duration < MIN_VIDEO_DURATION_SECONDS || file.duration > MAX_VIDEO_DURATION_SECONDS))) return { valid: false, message: "The video must be between 10 and 12 seconds long." };
  if (files.filter((file) => isProductImage(file.type)).length > MAX_PRODUCT_IMAGES) return { valid: false, message: "Upload either 5 images or 4 images with 1 video." };

  const names = new Set<string>();
  for (const file of incoming) {
    const key = `${file.name ?? ""}:${file.size ?? 0}`.toLowerCase();
    if (names.has(key)) return { valid: false, message: "Remove duplicate media files before uploading." };
    names.add(key);
  }
  return { valid: true };
}
