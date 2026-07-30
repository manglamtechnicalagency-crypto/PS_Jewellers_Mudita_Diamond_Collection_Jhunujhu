# Optimization report — 29 July 2026

First run of `docs/optimization-prompt.md`. Performance, then SEO, then
accessibility. `tsc --noEmit` exit 0, `npm test` 52/52 after the changes.

Nothing here is measured. `npm run build` cannot run in the environment these
changes were made in (`node_modules/@next` contains only `swc-win32-x64-msvc`),
so bundle sizes below are file sizes and reasoning, not observed output. Run
Lighthouse and a real build before trusting any number.

---

## Performance

### Fixed

**The seed catalogue was in the client bundle on every page load.**
`src/data.ts` is 46,480 bytes, mostly product seed data. `src/App.tsx` is a
`"use client"` module and imported `products` from it as a fallback that never
fired — the server always passes `initialProducts` from
`app/[[...slug]]/page.tsx`. `ShopPage` and `ProductPage` imported it too.

- `App.tsx:10` — seed import removed, fallback is now `[]`.
- `ShopPage.tsx:4` — seed import removed, `customProducts ?? []`.
- `ProductPage.tsx:5` — `products` dropped from the import.
- `package.json` — added `"sideEffects": ["*.css"]`. `HomePage`, `ProductCard`,
  and `SimplePage` still import small helpers (`formatPrice`, `categories`,
  `trustItems`) from `src/data.ts`; without a `sideEffects` declaration the
  bundler must assume the module has side effects and keeps all of it, including
  the seed array. CSS is listed so stylesheet imports are never dropped.

Expected effect: the seed catalogue leaves the client bundle. Confirm with a
bundle analyzer after a real build — this is the change most worth verifying.

**Background tabs polled the full catalogue every 30 seconds.**
`App.tsx` ran `setInterval(refreshCatalogue, 30_000)` regardless of tab
visibility, alongside three Supabase realtime subscriptions. Each poll costs
three Supabase queries via `/api/catalogue` (`force-dynamic`, `no-store`).

- Interval moved to 60s and gated on `document.visibilityState === "visible"`.
- Added a `visibilitychange` listener so a returning tab refreshes immediately
  instead of waiting out the interval.
- Listener removed in the effect cleanup.

Realtime remains the primary freshness mechanism; the interval now only covers a
dropped socket.

### Not fixed — largest remaining win

**The storefront cannot be cached at all.** `getPublishedCatalogue` uses
`createSupabaseServerClient`, which reads `cookies()`, which forces every
storefront request to be dynamically rendered. Every anonymous visitor triggers
three Supabase queries before first byte.

Public catalogue reads do not need cookies — `catalogue_products` is readable
under RLS without a session. A cookie-free Supabase client for public reads would
allow `revalidate` on `app/[[...slug]]/page.tsx` and drop anonymous Supabase load
to near zero. Deferred because it changes the rendering mode of every public page
and wants a real build plus load testing to confirm, which was not available.

**Admin uses raw `<img>`** at `ProductManager.tsx:43`, `MediaManager.tsx:450`,
`MediaManager.tsx:605`, `ProductEditor.tsx:562`, `ProductForm.tsx:124`. R2 assets
bypass Next's optimizer. Authenticated and low-traffic, so low priority.

---

## SEO

Audited; already in good shape. `src/lib/seo.ts` sets `alternates.canonical` per
route (`seo.ts:125`), emits product JSON-LD with `brand`, `offers`,
`availability`, and a conditional `aggregateRating`, and applies
`robots: { index: false }` to transactional routes (`seo.ts:179`).
`app/sitemap.ts` filters products through `getPublishedProductSlugs`, which
requires approved media — matching the storefront's own filter. `app/robots.ts`
disallows `/admin` and `/api`. JSON-LD escapes `<` before injection
(`app/[[...slug]]/page.tsx:52`).

### Observation, no change made

`metadataForRoute` has a `/product/` branch (`seo.ts:145`) resolving slugs against
the **seed file** via `findProductBySlug`. It is dead for storefront traffic:
`generateMetadata` in `app/[[...slug]]/page.tsx:24` intercepts `/product/` first
and uses the live catalogue. Harmless today, actively misleading to the next
person who edits it. Worth deleting or commenting; left alone because it is
reachable from tests and deleting it was out of scope for an optimization pass.

---

## Accessibility

### Fixed

**No skip link.** WCAG 2.4.1 Bypass Blocks, level A. Keyboard and screen-reader
users tabbed through the entire header navigation on every page before reaching
content. Added to `SiteLayout.tsx` as the first focusable element, visible on
focus, targeting `#main`. `<main>` gained `id="main"` and `tabIndex={-1}` so the
jump moves focus rather than only scrolling.

**The lock dialog did not trap focus.** `IdleLock.tsx` focused its input but Tab
walked straight out of the overlay into the admin UI underneath — which remains
fully focusable and operable by keyboard despite looking covered. A keyboard user
could have driven the whole admin panel from behind the lock screen. Added a Tab
trap cycling between the first and last focusable elements in the dialog.

### Not fixed — needs measurement

**Colour contrast is unverified.** The cream and gold palette is the obvious risk:
`text-muted` and `text-gold-600` on `bg-cream` appear throughout `ProductCard`,
`HomePage`, and the admin. Checking this properly needs the rendered page and a
contrast tool against the values in `tailwind.config.ts`, not a source read. If
any body text falls below 4.5:1 it is a level-AA failure and the palette needs
adjusting — a design decision, not a code one.

**Screen reader and keyboard-only walkthroughs have not been done.** The product
page and the admin product form are the two flows worth testing by hand.

---

## Verification status

| Check | Result |
|---|---|
| `npm run type-check` | exit 0 |
| `npm test` | 52 passed, 0 failed |
| `npm run build` | **not run** — platform mismatch, run locally |
| Lighthouse | **not run** |
| Bundle analyzer | **not run** — needed to confirm the seed catalogue is gone |
| Keyboard / screen reader | **not run** |

The three unrun checks are the ones that would actually confirm the performance
and accessibility claims above. Treat this report as a list of applied reasoning,
not a list of measured improvements.
