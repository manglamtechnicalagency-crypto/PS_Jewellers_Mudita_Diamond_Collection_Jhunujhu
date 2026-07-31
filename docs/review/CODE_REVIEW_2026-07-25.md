# Code Review — PS Jewellers storefront & admin

**Date:** 2026-07-25 · **Scope:** full codebase (`app/`, `src/`, `supabase/`, `proxy.ts`, `next.config.ts`)
**Original verdict:** 🔴 Request Changes — two issues blocked the admin panel entirely.
**Status 2026-07-25 (same day):** 16 of 17 findings fixed; 1 partially addressed. See
[Resolution](#resolution) at the end.

---

## Resolution

| # | Finding | Status | Where |
|---|---------|--------|-------|
| 1 | CSP blocked Supabase | ✅ Fixed | `src/lib/security-headers.ts`, `next.config.ts` |
| 2 | MFA advisory only, never challenged | ✅ Fixed | `src/lib/admin-auth.ts`, `app/admin/login/LoginForm.tsx` |
| 3 | Rate limit not durable | ✅ Fixed | `src/lib/upload-rate-limit.ts` — Upstash driver, in-memory fallback |
| 4 | Rate limit single global bucket | ✅ Fixed | Fails closed; `route.ts` returns 503 on untrusted key |
| 5 | No per-route metadata | ✅ Fixed | `src/lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts` |
| 6 | Hydration mismatch | ✅ Fixed | `src/App.tsx` |
| 7 | Menu focus trap | ✅ Fixed | `src/components/Header.tsx` — `inert` |
| 8 | `script-src 'unsafe-inline'` | ✅ Fixed | Nonce + `strict-dynamic` via `proxy.ts` |
| 9 | `img-src` blocked R2 | ✅ Fixed | `imageSources()` derives from env |
| 10 | Duplicate profile query | ✅ Fixed | `requireAdmin` returns `displayName` |
| 11 | Whole app one client bundle | ⚠️ Partial | SEO solved without the refactor; route-segment split still open |
| 12 | Raw `<img>`, no dimensions | ✅ Fixed | `next/image` throughout; video `preload="metadata"` |
| 13 | Zero tests | ✅ Fixed | `tests/` — 36 tests, `npm test` |
| 14 | CSRF passes on absent Origin | ✅ Fixed | `src/lib/request-origin.ts` — `Sec-Fetch-Site` check |
| 15 | Unused dependency | ✅ Fixed | `@supabase/server` removed |
| 16 | Live project ref in template | ✅ Fixed | `.env.example` placeholder |
| 17 | Duplicate nav entry | ✅ Fixed | "Collections" → "New In" |

**Verification:** `npm run type-check` clean · `npm test` 36/36 · `npm run build` succeeds ·
zero browser console warnings · no visual regression at 390 / 768 / 1440 / 1920.

### Still open

**Finding 11 — route-segment split.** The storefront remains a single `"use client"` component
under `app/[[...slug]]`, so all page components and the full catalogue still ship in one bundle.
Per-route metadata was solved with `generateMetadata` on the catch-all instead, which delivers the
SEO benefit without a routing rewrite. Splitting into real segments (`app/product/[slug]/page.tsx`
etc.) with cart and wishlist as client islands is a larger change that deserves its own PR.

**Before deploying:**

1. Set `NEXT_PUBLIC_SITE_URL` — canonical URLs and the sitemap otherwise resolve to `localhost:3000`.
2. Ensure Supabase catalogue migrations and published product/media rows are available; the sitemap omits product URLs when catalogue storage is unavailable.
3. Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or the limiter stays per-instance.
4. Enrol every admin account in TOTP. The server now rejects `aal1` sessions, so an account without a
   verified factor cannot reach `/admin` at all.

---

---

## Summary

Storefront is solid: strict TypeScript, no `any`, no injection surface (published catalogue data, no
user-generated content, no SQL string building), sensible RLS policies, and a genuinely well-hardened
R2 presign route. The problems are concentrated in the admin path, where the security model has a
gap between what the UI enforces and what the server enforces, and where the CSP contradicts the
runtime the app depends on.

---

## Critical

### 1. 🔴 CSP blocks Supabase — admin login cannot work

`next.config.ts:19`

```
connect-src 'self' https://*.r2.cloudflarestorage.com;
```

`LoginForm.tsx:24` calls `client.auth.signInWithPassword()`, which issues `fetch` to
`https://rghpbiltmbqetmqfyjte.supabase.co/auth/v1/token`. That origin is not in `connect-src`, so the
browser blocks it. Verified against the running dev server — the header is served on `/admin/login`.

Every admin sign-in fails with a CSP violation, not a credentials error, so the user sees the generic
`"Sign-in is temporarily unavailable"` branch and has no way to diagnose it.

**Fix:**

```ts
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// connect-src 'self' ${supabaseOrigin} https://*.r2.cloudflarestorage.com wss://*.supabase.co
```

Add `wss://` only if you later use Realtime.

### 2. 🔴 MFA is enforced in the browser only, and never actually completed

`LoginForm.tsx:30-42` vs `src/lib/admin-auth.ts:5-31`

The login form checks that a verified TOTP factor *exists* and signs out if not. Two defects:

**a. It never challenges the factor.** No `mfa.challenge()` / `mfa.verify()` call anywhere in the
codebase. The session stays at `aal1`. Possession of the second factor is never proven — only its
existence in the user record. This is not two-factor authentication.

**b. The check is client-side and therefore advisory.** `requireAdmin()` calls `auth.getUser()` and
reads `profiles.role`, but never inspects assurance level. An attacker with email + password can call
the Supabase token endpoint directly (the publishable key is public by design), obtain session
cookies, and reach `/admin` and `POST /api/admin/products` without ever loading `LoginForm`. The
sign-out on line 39 protects nobody who isn't cooperating.

**Fix** — enforce server-side in `requireAdmin`, before the role check:

```ts
const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
if (aalError) return { client, user: userData.user, role: null, error: "internal" as const };
if (aal.currentLevel !== "aal2") {
  return { client, user: userData.user, role: null, error: "unauthorized" as const };
}
```

Then add a real challenge/verify step to the login flow. Until both are done, treat the admin panel
as password-only.

---

## High

### 3. 🟠 Upload rate limit does not survive the deployment model

`src/lib/upload-rate-limit.ts:13`

```ts
const entries = new Map<string, RateLimitEntry>();
```

Module-level state. On Vercel each serverless instance holds its own map, so the effective ceiling is
`30 × instances/min`, and every cold start resets the window. Known and documented in
`docs/security/SECURITY_REMAINING_RISKS.md`, repeated here because it is the highest-impact open
item: the presign route mints credentials to write to your bucket.

**Fix:** move to Upstash Redis / Vercel KV keyed on the same client key, or Vercel's built-in rate
limiting. Keep the in-memory map as the local-dev fallback.

### 4. 🟠 Rate limit collapses to a single global bucket off Vercel

`src/lib/upload-rate-limit.ts:31`

```ts
return request.headers.get("x-vercel-forwarded-for")?.trim() || "unattributed";
```

Refusing to trust `x-forwarded-for` is the right instinct. But the fallback means that on any
non-Vercel host — self-hosted, Docker, preview via a different proxy — *all* callers share the key
`"unattributed"`. One authenticated client then trivially denies uploads to every other client at 31
requests/min. Fail closed on the header being absent, or make the trusted-header name configurable.

### 5. 🟠 No per-route metadata — product pages are invisible to search

`app/[[...slug]]/page.tsx` renders `<App />`, a `"use client"` component that switches on
`usePathname()`. Consequences:

- Every URL returns the same `<title>PS Jewellers</title>` and the same description from
  `app/layout.tsx:4-7`.
- `ProductPage.tsx:36` sets `document.title` after mount — invisible to crawlers that don't execute
  JS, and too late for social scrapers.
- No canonical URLs, no OpenGraph/Twitter tags, no `Product`/`Offer` JSON-LD, no `sitemap.xml`, no
  `robots.txt`.

For a retail catalogue this is a commercial defect, not a nitpick. Convert routes to real App Router
segments (`app/product/[slug]/page.tsx`) with `generateMetadata`, keeping cart/wishlist as small
client islands.

---

## Medium

### 6. 🟡 Hydration mismatch on cart, wishlist, and recently-viewed

`src/App.tsx:41-43`

```ts
const [wishlist, setWishlist] = useState<string[]>(() => readStored("ps-wishlist", []));
```

`readStored` touches `window.localStorage` inside the `useState` initializer. On the server `window`
is undefined; the `try/catch` swallows it and returns `[]`. So the server HTML always renders an
empty cart badge while the client renders the real count — a hydration mismatch on every visit with a
non-empty cart. React 19 patches it, but you get a console error and a visible badge flash.

**Fix:** initialise to the fallback, load in `useEffect`:

```ts
const [cart, setCart] = useState<CartLine[]>([]);
useEffect(() => setCart(readStored("ps-cart", [])), []);
```

Guard the persist effects so the first run doesn't overwrite storage with `[]`.

### 7. 🟡 Closed mobile menu is still keyboard-focusable

`src/components/Header.tsx` — the panel hides with `pointer-events-none opacity-0`. Neither removes
elements from the tab order. A keyboard user tabbing through the header walks into eight invisible
nav links and three invisible footer links. `aria-hidden={!open}` hides them from screen readers
while leaving them focusable, which is itself an ARIA violation.

**Fix:** add `inert` when closed (`inert={!open}`), or toggle `hidden` after the transition.

### 8. 🟡 `script-src 'unsafe-inline'` defeats the CSP's main purpose

`next.config.ts:5`. The rest of the policy is well-constructed — `object-src 'none'`,
`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` are all correct. Allowing inline
script undoes most of the XSS benefit. Current exposure is low (no user-generated content rendered as
HTML), but that changes the moment the admin panel writes `short_description` to a page. Move to
nonce-based CSP via middleware/`proxy.ts` and `strict-dynamic`.

### 9. 🟡 `img-src` will block your own uploaded images

`next.config.ts:19` — `img-src 'self' data: https://images.unsplash.com`. The presign route returns
`publicUrl` built from `NEXT_PUBLIC_R2_PUBLIC_URL` (`app/api/admin/media/presign/route.ts`). Any image
served from that host will be blocked once the admin media library goes live. Add the R2 public
origin.

### 10. 🟡 Profile row is fetched twice per admin request

`src/lib/admin-auth.ts:18` selects `role`; `app/admin/page.tsx:20` immediately selects
`display_name, role` for the same `id`. With `force-dynamic` that's two round trips on every load,
plus `getUser()`, plus four count queries. Return `display_name` from `requireAdmin` and drop the
second query.

### 11. 🟡 Entire storefront ships as one client bundle

`"use client"` at `src/App.tsx:1` pulls all seven page components, all 18 products, and every helper
into the initial JS payload for every route. No route-level code splitting, no RSC payload savings.
Same fix as finding 5 — real route segments.

### 12. 🟡 Raw `<img>` everywhere, no dimensions

No `next/image` anywhere. Product images are hotlinked from Unsplash at `w=1400` and rendered into
~170px mobile cards — you download roughly 60× the pixels needed. No `width`/`height` on most tags, so
every image contributes CLS. `ProductCard.tsx` has `loading="lazy"`, which is good; the hero video
(6.4 MB, `ps-hero-video.mp4`) autoplays on mobile with no `preload` hint or reduced-motion opt-out.

### 13. 🟡 Zero tests

No test runner, no test files, no CI workflow. `npm run type-check` is the only gate. For code that
mints storage credentials and gates an admin panel, at minimum cover `validateUploadRequest`,
`hasValidToken`, `consumeUploadRateLimit`, and `requireAdmin` role branches.

---

## Low

### 14. 🟢 CSRF check passes when `Origin` is absent

`src/lib/admin-auth.ts:33-37`

```ts
if (!origin) return true;
```

Defensible — browsers always send `Origin` on cross-site POSTs, and a non-browser client has no
victim cookies. Tighten by also accepting only when `sec-fetch-site` is `same-origin`.

### 15. 🟢 Unused dependency

`@supabase/server@1.4.1` is installed and imported nowhere. Pinned exact while everything else uses
carets. Drop it.

### 16. 🟢 Live project ref committed in `.env.example`

`SUPABASE_URL=https://rghpbiltmbqetmqfyjte.supabase.co` — not a secret (it ships in the client
bundle), but a template file should carry a placeholder.

### 17. 🟢 Duplicate nav entry

`Header.tsx` — "Shop" and "Collections" both point to `/shop`.

---

## What looks good

- **`app/api/admin/media/presign/route.ts`** is the current upload gate: Supabase session and AAL2,
  editor-level authorization, strict body validation, MIME allowlist driving the extension, UUID
  keys, short-lived presigned URLs, and safe errors.
- **RLS is on and policies are role-scoped**, with `is_admin()` / `is_admin_or_editor()` as
  `security definer ... set search_path = public` — the correct pattern.
- **Zod schema is `.strict()`** with bounded lengths and a slug regex; `23505` mapped to 409.
- **No secrets in client code.** `r2-server.ts` carries an explicit warning comment and is imported
  only from the route.
- **Strict TS, no `any`, no `dangerouslySetInnerHTML`, no `eval`.**
- Unknown product slug renders `NotFoundPage` rather than falling back to product zero.

---

## Recommended order

1. Fix `connect-src` (finding 1) — admin is non-functional without it.
2. Enforce `aal2` server-side and add a real TOTP challenge (finding 2).
3. Move rate limiting to shared storage; fail closed on missing client key (findings 3, 4).
4. Route segments + `generateMetadata` (findings 5, 11) — unblocks SEO and bundle size together.
5. Hydration and `inert` fixes (findings 6, 7).
