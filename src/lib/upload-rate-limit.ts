interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;
const entries = new Map<string, RateLimitEntry>();

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig() {
  return {
    windowMs: readPositiveInteger(process.env.R2_UPLOAD_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_MS / 1_000) * 1_000,
    maxRequests: readPositiveInteger(process.env.R2_UPLOAD_RATE_LIMIT_MAX_REQUESTS, DEFAULT_MAX_REQUESTS),
  };
}

export function getTrustedClientKey(request: Request): string {
  // Vercel supplies this value after normalising client forwarding headers. Do not
  // accept x-forwarded-for directly: a caller can forge it to bypass the limit.
  return request.headers.get("x-vercel-forwarded-for")?.trim() || "unattributed";
}

export function consumeUploadRateLimit(clientKey: string): RateLimitResult {
  const { windowMs, maxRequests } = getConfig();
  const now = Date.now();
  const current = entries.get(clientKey);

  if (!current || now - current.windowStartedAt >= windowMs) {
    entries.set(clientKey, { count: 1, windowStartedAt: now });
    return { limited: false, retryAfterSeconds: Math.ceil(windowMs / 1_000) };
  }

  current.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - current.windowStartedAt)) / 1_000));
  return { limited: current.count > maxRequests, retryAfterSeconds };
}
