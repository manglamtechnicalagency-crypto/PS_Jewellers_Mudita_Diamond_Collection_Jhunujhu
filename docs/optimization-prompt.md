# Website optimization prompt — PS Jewellers

A repeatable pass over performance, SEO, and accessibility. Paste the whole file
to an agent, or work through it manually. Written against this repo specifically,
so the checks name real files rather than generic advice.

## Ground rules

1. Trace the real execution path before editing. This codebase has two catalogue
   sources (`src/data.ts` seed and the Supabase `catalogue_products` view) and it
   is easy to "fix" the one nobody reads.
2. Never compress or reword user-facing storefront copy, prices, SKUs, or product
   names. Optimization changes delivery, not content.
3. Run `npm run type-check` and `npm test` after every pass, and `npm run build`
   before shipping. The build must run on a machine whose `node_modules/@next`
   matches its platform — a Windows install cannot be built from Linux.
4. Report findings as `file:line — verdict, then reason`. One line each.

## Pass 1 — Performance

**Client bundle**

- [ ] Does any `"use client"` module import `src/data.ts`? It is ~46 KB of seed
      catalogue. `src/App.tsx`, `ShopPage`, and `ProductPage` each pulled it in at
      some point. Only `src/lib/seo.ts` and `app/[[...slug]]/page.tsx` (both
      server-side) should reference `products`.
- [ ] Is `"sideEffects"` still set in `package.json`? Removing it silently
      disables tree-shaking and the seed catalogue returns to the client bundle.
- [ ] Run `npx @next/bundle-analyzer` or check `.next/analyze` after a build.
      Anything over 50 KB in a shared chunk deserves an explanation.

**Network**

- [ ] `src/App.tsx` polls `/api/catalogue` on an interval *and* holds three
      Supabase realtime subscriptions. Confirm the interval still skips hidden
      tabs (`document.visibilityState`) and that the interval is a fallback for a
      dropped socket, not the primary refresh path.
- [ ] `/api/catalogue` is `force-dynamic` + `no-store` and runs three Supabase
      queries per call. Every poll from every open tab costs that.
- [ ] The storefront page is dynamic because `createSupabaseServerClient` reads
      `cookies()`. Public catalogue reads do not need cookies — a cookie-free
      client would allow ISR and cut Supabase load to near zero for anonymous
      traffic. **Not yet done; largest remaining win.**

**Images**

- [ ] Storefront components must use `next/image`, not `<img>`. Currently clean.
- [ ] Admin still uses raw `<img>` in `ProductManager.tsx:43`,
      `MediaManager.tsx:450,605`, `ProductEditor.tsx:562`, `ProductForm.tsx:124`.
      Lower priority (authenticated, low traffic) but unoptimized R2 delivery.
- [ ] Every `next/image` needs a correct `sizes`. A wrong `sizes` downloads a
      desktop-width file onto a phone.
- [ ] Above-the-fold imagery carries `priority`; everything else lazy-loads.

## Pass 2 — SEO and structured data

- [ ] Every public route resolves metadata through `src/lib/seo.ts`. Check
      `STATIC_ROUTE_META` covers all routes `src/App.tsx` can render — a route
      handled in `App` but missing from the map falls through to "Page Not Found"
      metadata while rendering real content.
- [ ] `alternates.canonical` is set per route (`seo.ts:125`).
- [ ] Product JSON-LD includes `brand`, `offers`, `availability`, and
      `aggregateRating` only when a real rating exists. Never emit a fabricated
      rating — it is a manual-action risk.
- [ ] `app/sitemap.ts` lists only products that actually render. It filters on
      approved media via `getPublishedProductSlugs`, matching the storefront's own
      filter in `src/lib/catalogue-data.ts`. If one filter changes, change both.
- [ ] `app/robots.ts` disallows `/admin` and `/api`.
- [ ] Transactional routes carry `robots: { index: false }` (`seo.ts:179`).
- [ ] One `<h1>` per page, headings in order, no level skips.
- [ ] Every product image has meaningful `alt` — the product name, not the
      filename.

## Pass 3 — Accessibility (WCAG 2.1 AA)

- [ ] Skip link present and first in tab order (`SiteLayout.tsx`), pointing at
      `#main`.
- [ ] Contrast: the cream/gold palette is the risk area. `text-muted` and
      `text-gold-600` on `bg-cream` need checking at 4.5:1 for body text and 3:1
      for large text. Verify against `tailwind.config.ts` values.
- [ ] Every interactive control reachable and operable by keyboard. Watch for
      `<div onClick>` — use real `<button>`.
- [ ] Visible focus indicators everywhere; do not remove outlines without a
      `focus-visible` replacement.
- [ ] Modals and overlays trap focus and restore it on close. `IdleLock.tsx`
      traps Tab; any new dialog must do the same.
- [ ] Touch targets at least 44×44 CSS px. Admin controls use `min-h-11`.
- [ ] Form inputs have associated labels, and errors use `role="alert"`.
- [ ] Status messages use `role="status"`.
- [ ] Icon-only buttons carry `aria-label`; decorative icons carry
      `aria-hidden="true"`.
- [ ] Test with keyboard only, then with a screen reader on the product page and
      the admin product form.

## Verification

```bash
npm run type-check
npm test
npm run build          # must run on the platform that installed node_modules
npx playwright test    # tests/browser, needs E2E_BASE_URL
```

Then measure rather than assume: Lighthouse on `/`, `/shop`, and a product page,
mobile preset, and compare against the previous run. Record the numbers in
`docs/optimization-report.md`.
