export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const contentTypeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

export type SupportedUploadContentType = keyof typeof contentTypeExtensions;

export interface UploadRequest {
  contentType: SupportedUploadContentType;
  fileSize: number;
}

export interface UploadValidationError {
  code: "invalid_request" | "unsupported_media_type" | "file_too_large";
  message: string;
  status: 400 | 413 | 415;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedContentType(value: unknown): value is SupportedUploadContentType {
  return typeof value === "string" && Object.hasOwn(contentTypeExtensions, value);
}

export function validateUploadRequest(body: unknown): UploadRequest | UploadValidationError {
  if (!isRecord(body) || Object.keys(body).length !== 2 || !("contentType" in body) || !("fileSize" in body)) {
    return { code: "invalid_request", message: "Request body must contain only contentType and fileSize", status: 400 };
  }

  const contentType = body.contentType;
  const fileSize = body.fileSize;
  if (!isSupportedContentType(contentType)) {
    return { code: "unsupported_media_type", message: "Only JPEG, PNG, WebP, and AVIF images are allowed", status: 415 };
  }

  if (typeof fileSize !== "number" || !Number.isSafeInteger(fileSize) || fileSize <= 0) {
    return { code: "invalid_request", message: "fileSize must be a positive integer", status: 400 };
  }

  if (fileSize > MAX_UPLOAD_BYTES) {
    return { code: "file_too_large", message: `fileSize must not exceed ${MAX_UPLOAD_BYTES} bytes`, status: 413 };
  }

  return { contentType, fileSize };
}

export function isUploadValidationError(value: UploadRequest | UploadValidationError): value is UploadValidationError {
  return "code" in value;
}

export function extensionForContentType(contentType: SupportedUploadContentType): string {
  return contentTypeExtensions[contentType];
}
