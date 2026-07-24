import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createUploadUrl } from "@/src/lib/r2-server";
import { consumeUploadRateLimit, getTrustedClientKey } from "@/src/lib/upload-rate-limit";
import { extensionForContentType, isUploadValidationError, validateUploadRequest } from "@/src/lib/upload-policy";

export const runtime = "nodejs";

const MAX_REQUEST_BODY_BYTES = 1_024;

function hasValidToken(request: Request, expectedToken: string | undefined): boolean {
  if (!expectedToken) return false;

  const providedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const provided = Buffer.from(providedToken);
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

function jsonError(code: string, message: string, status: number, requestId: string, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error: { code, message, requestId } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
        ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
      },
    },
  );
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) throw new Error("body_too_large");

  const text = await request.text();
  if (text.length > MAX_REQUEST_BODY_BYTES) throw new Error("body_too_large");
  return JSON.parse(text) as unknown;
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const limit = consumeUploadRateLimit(getTrustedClientKey(request));
  if (limit.limited) {
    console.warn("[r2-presign] rate_limit_exceeded", { requestId });
    return jsonError("rate_limited", "Too many upload requests", 429, requestId, limit.retryAfterSeconds);
  }

  if (!hasValidToken(request, process.env.R2_UPLOAD_ADMIN_TOKEN)) {
    console.warn("[r2-presign] unauthorized_request", { requestId });
    return jsonError("unauthorized", "Authentication is required", 401, requestId);
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof Error && error.message === "body_too_large") {
      return jsonError("request_too_large", "Request body must not exceed 1024 bytes", 413, requestId);
    }
    return jsonError("invalid_request", "Request body must be valid JSON and no larger than 1024 bytes", 400, requestId);
  }

  const upload = validateUploadRequest(body);
  if (isUploadValidationError(upload)) return jsonError(upload.code, upload.message, upload.status, requestId);

  const objectKey = `uploads/${randomUUID()}.${extensionForContentType(upload.contentType)}`;

  try {
    const uploadUrl = await createUploadUrl(objectKey, upload.contentType, upload.fileSize);
    const publicBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

    return NextResponse.json(
      { uploadUrl, objectKey, publicUrl: publicBase ? `${publicBase}/${objectKey}` : null },
      { headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  } catch (error) {
    console.error("[r2-presign] create_upload_url_failed", {
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("upload_unavailable", "Could not create upload URL", 500, requestId);
  }
}
