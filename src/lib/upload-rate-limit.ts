interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
  /** False when the limiter is per-instance rather than shared across the fleet. */
  durable: boolean;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;

/**
 * Process-local fallback. Correct on a single instance, insufficient on a
 * horizontally scaled deployment: each instance keeps its own window, so the
 * effective ceiling is `max × instances` and every cold start resets it.
 * Configure Upstash Redis (see below) in any environment that scales.
 */
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

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export interface ClientKeyResult {
  key: string | null;
  /** True when the platform supplied a trustworthy client identifier. */
  trusted: boolean;
}

/**
 * Resolves the value the limiter buckets on.
 *
 * Only headers set by the platform edge are trusted. `x-forwarded-for` is
 * attacker-controlled and would let a caller mint a fresh bucket per request.
 * When no trusted header exists we report `trusted: false` so the caller can
 * fail closed instead of dropping every client into one shared bucket.
 */
export function getTrustedClientKey(request: Request): ClientKeyResult {
  const platformHeaders = ["x-vercel-forwarded-for", "cf-connecting-ip", "true-client-ip"];
  for (const header of platformHeaders) {
    const value = request.headers.get(header)?.trim();
    if (value) return { key: value, trusted: true };
  }

  // Local development has no edge in front of it; bucket everything together
  // rather than blocking the developer.
  if (process.env.NODE_ENV !== "production") return { key: "local-development", trusted: true };

  if (process.env.R2_UPLOAD_RATE_LIMIT_TRUST_UNIDENTIFIED === "true") {
    return { key: "unattributed", trusted: true };
  }

  return { key: null, trusted: false };
}

function consumeInMemory(clientKey: string): RateLimitResult {
  const { windowMs, maxRequests } = getConfig();
  const now = Date.now();
  const current = entries.get(clientKey);

  if (!current || now - current.windowStartedAt >= windowMs) {
    entries.set(clientKey, { count: 1, windowStartedAt: now });
    // Opportunistic sweep so the map cannot grow without bound.
    if (entries.size > 10_000) {
      for (const [key, entry] of entries) {
        if (now - entry.windowStartedAt >= windowMs) entries.delete(key);
      }
    }
    return { limited: false, retryAfterSeconds: Math.ceil(windowMs / 1_000), durable: false };
  }

  current.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - current.windowStartedAt)) / 1_000));
  return { limited: current.count > maxRequests, retryAfterSeconds, durable: false };
}

/**
 * Shared counter via Upstash Redis REST: INCR then EXPIR on first hit. Two round
 * trips worst case, pipelined into one request.
 */
async function consumeUpstash(clientKey: string, config: { url: string; token: string }): Promise<RateLimitResult> {
  const { windowMs, maxRequests } = getConfig();
  const windowSeconds = Math.ceil(windowMs / 1_000);
  // Namespace for this limiter's buckets. The only caller is
  // /api/admin/media/presign (the old /api/r2-presign route is gone), so the
  // prefix matches that. Changing this string starts every client on a fresh
  // counter: in-flight buckets under the previous prefix are orphaned and
  // expire on their own TTL, so callers briefly get a full new allowance.
  const redisKey = `media-presign:${clientKey}`;

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSeconds), "NX"],
      ["TTL", redisKey],
    ]),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`upstash_http_${response.status}`);

  const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  const count = Number(payload[0]?.result);
  const ttl = Number(payload[2]?.result);
  if (!Number.isFinite(count)) throw new Error("upstash_bad_response");

  return {
    limited: count > maxRequests,
    retryAfterSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : windowSeconds,
    durable: true,
  };
}

export async function consumeUploadRateLimit(clientKey: string): Promise<RateLimitResult> {
  const upstash = upstashConfig();
  if (!upstash) return consumeInMemory(clientKey);

  try {
    return await consumeUpstash(clientKey, upstash);
  } catch (error) {
    // Never let a limiter outage take the route down; degrade to the local
    // counter and surface it in logs.
    console.error("[upload-rate-limit] durable_store_unavailable", {
      errorName: error instanceof Error ? error.message : "UnknownError",
    });
    return consumeInMemory(clientKey);
  }
}
