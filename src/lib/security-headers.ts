/**
 * Single source of truth for the Content-Security-Policy.
 *
 * Built here rather than inline in `next.config.ts` because the policy needs a
 * per-request nonce (see `proxy.ts`), which static `headers()` cannot provide.
 * `next.config.ts` still emits a nonce-less fallback so that any response which
 * bypasses the proxy is not left unprotected.
 */

function originOf(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

/** Origins the browser must be allowed to talk to, derived from env. */
export function connectSources(): string[] {
  const sources = new Set<string>(["'self'", "https://*.r2.cloudflarestorage.com"]);

  const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL);
  if (supabase) {
    // Admin auth (signInWithPassword, MFA challenge/verify) is a browser fetch to
    // this origin. Omitting it silently breaks every admin sign-in.
    sources.add(supabase);
    sources.add(supabase.replace(/^https:/, "wss:"));
  }

  return [...sources];
}

/** Origins images may be loaded from, derived from env. */
export function imageSources(): string[] {
  const sources = new Set<string>(["'self'", "data:", "blob:", "https://images.unsplash.com"]);

  const r2Public = originOf(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);
  if (r2Public) sources.add(r2Public);

  return [...sources];
}

export interface CspOptions {
  /** Per-request nonce. Omit for the static fallback policy. */
  nonce?: string;
  isDevelopment?: boolean;
}

export function buildContentSecurityPolicy({ nonce, isDevelopment = false }: CspOptions = {}): string {
  const scriptSources = ["'self'"];

  if (nonce) {
    scriptSources.push(`'nonce-${nonce}'`);
    // Lets Next's nonced bootstrap load the chunks it depends on without
    // enumerating every hashed filename.
    scriptSources.push("'strict-dynamic'");
  } else {
    // Fallback path only: no nonce available, so inline bootstrap must be allowed.
    scriptSources.push("'unsafe-inline'");
  }

  if (isDevelopment) {
    // React Refresh and Turbopack's HMR client both need eval.
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `script-src ${scriptSources.join(" ")}`,
    // Tailwind and React inject inline <style>; nonces are not threaded through
    // those, so 'unsafe-inline' stays for styles only. Style injection is not a
    // script-execution vector under this policy.
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imageSources().join(" ")}`,
    `media-src 'self'`,
    `font-src 'self' data:`,
    `connect-src ${connectSources().join(" ")}`,
    `form-action 'self'`,
    `frame-src 'none'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
  ];

  if (!isDevelopment) directives.push("upgrade-insecure-requests");

  return directives.join("; ") + ";";
}

export const STATIC_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
] as const;
