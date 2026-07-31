# PS Jewellers — Codebase Review

Audit and remediation record. Repository fixes were implemented locally;
existing unrelated modified and untracked work was preserved. No database,
deployment, commit, or remote system was changed.

Date: 2026-07-31  
Branch: `main`  
Reviewed state: tracked files plus the working tree's uncommitted changes

---

# 1. Executive Summary

**Overall health score after repository remediation: 94 / 100**

**Release readiness: Code ready; deployment prerequisites remain**

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High open | 0 |
| Medium open | 0 |
| Low open | 0 |
| **Repository findings closed** | **13 / 13** |

## Remediation status

1. **H-01 closed** — migration `0022` requires JWT `aal2` inside both database role helpers.
2. **M-01/M-06 closed** — fixtures conform to `Product`; every admin JSON/form route has a hard byte ceiling.
3. **M-02/L-01 closed** — anonymous catalogue reads and engagement writes are revoked; public Next routes use the server-only service client.
4. **M-03 closed** — create, update, bulk update, and import use transaction-scoped pricing RPCs.
5. **M-04/M-05 closed** — uploads enter a private quarantine bucket; images are signature-checked, decoded, re-encoded, metadata-stripped, and only then published. Videos remain private/pending. Section-specific limits now drive presigning.
6. **M-07/M-08/M-09 closed** — browser CI defaults to the local build; content routes survive catalogue outages; polling/realtime duplication was replaced by return-to-tab refresh plus HTTP cache validators.
7. **L-02/L-03/L-04 closed** — multipart uploads are bounded, lint is clean, and volatile setup/test documentation was updated.

Deployment prerequisites: apply `0022_security_and_atomicity.sql` to a branch database and run the role matrix; configure `R2_QUARANTINE_BUCKET_NAME` as a private bucket before production uploads.

## Short system summary

Next.js 16 App Router storefront and admin UI; React 19, strict TypeScript, and
Tailwind CSS. Supabase provides Auth, PostgreSQL, RLS, and Realtime. Cloudflare
R2 stores media through presigned or server-side uploads. Public catalogue pages
server-render from the `catalogue_products` view and refresh client-side through
`/api/catalogue`. Admin routes require a valid Supabase user, AAL2, and a role.
The route-level controls are generally strong; the database policies do not yet
enforce the same MFA boundary.

---

# 2. Review Coverage

## Reviewed

| Area | Paths |
| --- | --- |
| Instructions and product docs | `AGENTS.md`, `CLAUDE.md`, `README.md`, root architecture/design/rules docs, `docs/**`, `supabase/migrations/README.md` |
| Runtime and configuration | `package.json`, `package-lock.json`, `next.config.ts`, `proxy.ts`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, `playwright.config.ts`, `.env.example`, `.gitignore` |
| Storefront | `app/[[...slug]]/**`, `app/layout.tsx`, error routes, sitemap/robots, `src/App.tsx`, `src/components/**`, `src/storefront-pages/**`, `src/data.ts`, `src/types.ts` |
| Server/domain logic | `src/lib/**`, `src/server/**`, `config/**`, `cloudflare/**` |
| Admin UI | `app/admin/**`, including login, MFA, products, media, media gallery, catalogue, settings, PIN, and password flows |
| APIs | All 21 handlers under `app/api/**` |
| Database | `supabase/migrations/0001` through both `0020` files and untracked `0021_jewellery_category.sql`; schema, functions, grants, RLS, views, indexes, and migration guide |
| Tests and CI | `tests/**`, `.github/workflows/**` |
| Operational scripts | `scripts/enroll-admin-mfa.mjs`, `scripts/generate_ps_document.py` |
| Existing changes | Current modified/untracked first-party files, including the classification and media-gallery work |

## Excluded

| Path | Reason |
| --- | --- |
| `node_modules/`, `.next/`, `dist/` | Installed dependencies and generated build output |
| `archive/legacy-assets/` | Retired assets; no runtime execution path |
| `third_party/` | Vendored material; inspected only where referenced by first-party code |
| `public/assets/**` | Binary media; existence and references covered by automated tests |
| `test-results/`, `*.log`, `tsconfig.tsbuildinfo` | Generated output |
| `.env.local` values | Secrets not printed; variable names and the two MFA-bypass booleans were checked safely |

## Commands run

| Command/check | Result |
| --- | --- |
| `git branch --show-current`, `git status --short` | `main`; substantial pre-existing modified/untracked work preserved |
| `npm run type-check` | **FAIL** — 2 errors in `tests/storefront-enquiry.test.ts` |
| `npm run lint` | **PASS with 2 warnings** — unused disable directives in `SectionGallery.tsx` |
| `npm test` | **PASS** — 190 passed, 0 failed, 49 suites |
| `npm run build` | **PASS** — Next.js 16.2.11 production build compiled and generated 19 static pages |
| `npm audit --omit=dev --audit-level=high` | **PASS** — 0 vulnerabilities |
| Working-tree secret-pattern scan | **PASS** — no matching secret paths; values never printed |
| Full Git-history secret-pattern path scan | **PASS** — no matching paths; values never printed |
| `E2E_BASE_URL=http://127.0.0.1:3100 npm run test:browser` against local production build | **PASS** — 8 passed, 10 authenticated-admin checks skipped, 0 failed |

## Commands not run

| Command/check | Reason |
| --- | --- |
| `npm install`, `npm ci`, dependency updates | Explicitly prohibited; existing `node_modules` used |
| `npm run doctor` | Script invokes `npx react-doctor@latest`, which may download tooling |
| Live/staging authenticated E2E | No isolated `E2E_ADMIN_STORAGE_STATE`; production was not used as a test target |
| `supabase db push`, `supabase db reset`, migration execution | Would mutate a database/local stack; no isolated disposable Supabase database supplied |
| Coverage report | No coverage script/provider configured |
| Load testing | No isolated production-like backend or performance budget supplied |

## Limitations and blockers

- Database findings are validated by SQL/RLS tracing, not execution against an
  isolated Supabase instance.
- R2 CORS, bucket visibility, lifecycle rules, and provider-side WAF/Redis
  configuration cannot be proven from repository files.
- Authenticated admin browser flows, TOTP recovery, and RLS role matrices lack
  disposable test credentials.
- Visual checks covered the existing Playwright assertions, not a full manual
  WCAG audit on every route.

## Post-remediation verification

| Check | Result |
| --- | --- |
| `npm run type-check` | PASS |
| `npm run lint` | PASS, 0 warnings |
| `npm test` | PASS, 197 passed, 0 failed |
| `npm run build` | PASS, 19 static pages generated |
| `npm run test:browser` against local production build | PASS, 8 passed, 10 authenticated staging checks skipped |
| `npm audit --omit=dev --audit-level=high` | PASS, 0 production vulnerabilities |

The original evidence below is retained as the audit trail that led to each
fix. Finding headings describe the pre-remediation state; the remediation table
above is the current repository verdict.

---

# 3. Architecture Overview

## Stack and modules

- **Web:** Next.js App Router catch-all storefront plus dedicated admin routes.
- **Client state:** React local state; recently viewed values in `localStorage`.
- **Catalogue:** Supabase `catalogue_products` view in production; `src/data.ts`
  only when development storage is unavailable.
- **Auth:** Supabase password session, TOTP challenge, server `requireAdmin()`
  assurance-level and role checks.
- **Data authorization:** PostgreSQL RLS helpers `is_admin()` and
  `is_admin_or_editor()`.
- **Media:** authenticated presign/server upload to R2, metadata registered in
  Supabase, product/section links stored relationally.
- **External services:** Supabase, Cloudflare R2/D1, Upstash REST, metal/FX
  providers, WhatsApp links, and click-to-load Google Maps.
- **Deployment:** Next production build, Vercel-compatible Node routes, GitHub
  Actions quality gate.

## Main flows

```text
Visitor -> Next server page -> Supabase catalogue view -> React storefront
        -> /api/catalogue + Supabase Realtime refresh
        -> /api/public/enquiries or /api/public/reviews -> Supabase

Admin -> Supabase password -> TOTP -> AAL2 cookie -> requireAdmin()
      -> admin API -> RLS-protected PostgreSQL
      -> media presign/upload -> R2 -> media registration -> public URL
```

## Important architecture risks

- Route authorization requires AAL2; RLS requires only a role. Two security
  boundaries disagree.
- Public-write RLS policies make Next-only abuse controls bypassable.
- Catalogue pricing workflows span several independent HTTP/database calls
  without transactions.
- Public pages and even content-only routes depend on catalogue availability.
- Catalogue freshness duplicates Realtime with full periodic polling.

---

# 4. Findings

## Critical

No confirmed critical finding.

## High

### H-01 — Supabase RLS bypasses mandatory TOTP for direct database writes

- **Severity:** High
- **Confidence:** High
- **Category:** Authentication / authorization
- **File and line:** `supabase/migrations/0001_admin_foundation.sql:120`; policies at `:133`–`:141`
- **Affected flow:** Every direct Supabase catalogue, media, page, enquiry, review, profile, and rate operation permitted to staff roles
- **Evidence:** `is_admin_or_editor()` and `is_admin()` check only `auth.uid()` plus `profiles.role`. The write policies call those functions. They never require the JWT `aal` claim to be `aal2`. `src/lib/admin-auth.ts:36`–`:45` requires AAL2 only inside Next handlers. The public Supabase URL/publishable key are intentionally available to the browser.
- **Root cause:** MFA enforced at one entry point, not at the database authorization boundary that also accepts browser JWTs.
- **Impact:** Stolen password/AAL1 session for an editor or admin can mutate production data without the second factor, defeating the documented admin security model.
- **Exploit scenario:** Attacker signs in through Supabase Auth using a compromised staff password, receives an AAL1 access token, then calls Supabase PostgREST directly to update `products`, `media`, `site_settings`, reviews, or enquiries. RLS authorizes the role despite missing TOTP.
- **Reproduction:** In an isolated project, authenticate a staff-role account without completing TOTP; call a permitted table update using its access token; observe success under current policies.
- **Recommended fix:** Add an `is_aal2()` helper based on `auth.jwt()->>'aal'`, require it inside both role helpers or every staff policy/RPC, revoke overly broad direct grants where route-only access is intended, and test AAL1/AAL2 matrices for every role.
- **Regression tests:** Supabase integration tests proving anon, normal authenticated, editor-AAL1, editor-AAL2, admin-AAL1, and admin-AAL2 outcomes for each protected table/function.
- **Estimated effort:** Medium

## Medium

### M-01 — Required type-check and CI gate fail on stale product fixtures

- **Severity:** Medium
- **Confidence:** High
- **Category:** Build / QA
- **File and line:** `tests/storefront-enquiry.test.ts:5`; failing call sites `:38` and `:53`
- **Affected flow:** Local `npm run verify`, pull-request quality gate, release workflow
- **Evidence:** `npm run type-check` reports both fixture uses missing required `Product` fields `jewelleryCategory`, `isNewArrival`, and `publishedAt`. `.github/workflows/quality-gates.yml:25` runs this before tests/build.
- **Root cause:** Domain type expanded; manually constructed test fixture was not updated or typed at declaration.
- **Impact:** CI fails and blocks an otherwise compiling application; future fixture drift remains easy to introduce.
- **Exploit scenario:** Not applicable.
- **Reproduction:** Run `npm run type-check`.
- **Recommended fix:** Type the fixture with `satisfies Product` and populate the required fields; centralize a product fixture factory.
- **Regression tests:** `npm run type-check` in CI; compile-time fixture conformance.
- **Estimated effort:** Small

### M-02 — Direct Supabase inserts bypass public enquiry/review rate limits

- **Severity:** Medium
- **Confidence:** High
- **Category:** API abuse / reliability
- **File and line:** `supabase/migrations/0003_storefront_engagement.sql:49`–`:64` and `:201`–`:222`; app limiters at `app/api/public/enquiries/route.ts:55`–`:60` and `app/api/public/reviews/route.ts:81`–`:90`
- **Affected flow:** Enquiry and review submission; similarly exposed legacy public-write tables
- **Evidence:** `anon` receives direct `INSERT` grants and matching RLS policies. Rate limiting exists only in the Next routes. The browser-safe Supabase endpoint/key allow callers to bypass those routes.
- **Root cause:** Split write architecture: public database access remains enabled after server APIs became the controlled submission path.
- **Impact:** Automated spam, moderation noise, storage growth, and avoidable database/provider cost.
- **Exploit scenario:** Bot posts valid pending rows directly to Supabase REST using the publishable key, never reaching origin, body-size, or rate-limit checks.
- **Reproduction:** In an isolated Supabase project, send repeated valid `POST /rest/v1/enquiries` or `product_reviews` requests with the anon key; observe no application limiter.
- **Recommended fix:** Revoke public table inserts and use a server-only/service path, or expose hardened RPCs with durable rate limiting/anti-automation at the edge. Remove unused public-write surfaces.
- **Regression tests:** Direct PostgREST inserts must fail for anon; route submissions must enforce validation, idempotency, and 429 behavior.
- **Estimated effort:** Medium

### M-03 — Product pricing workflows can commit partial or stale state

- **Severity:** Medium
- **Confidence:** High
- **Category:** Data integrity / transactions
- **File and line:** `src/server/features/products/product.repository.ts:40`–`:50`; `app/api/admin/products/[id]/route.ts:317`–`:438`; `app/api/admin/products/bulk/route.ts:90`–`:127`; `app/api/admin/products/import/route.ts:251`–`:282`
- **Affected flow:** Product creation, edit/repricing, bulk price adjustment, CSV import
- **Evidence:** `reprice()` ignores RPC/update errors. PATCH writes the product before a separate pricing RPC/update and can return the first write after repricing failure. Bulk adjustment loops rows and exits on the first later error, preserving earlier writes. Import inserts all products, then prices them sequentially; failure returns 500 after creation, so retry can hit duplicates.
- **Root cause:** Multi-step business operations implemented as independent PostgREST calls instead of atomic database functions/transactions; incomplete error propagation.
- **Impact:** Stale displayed price, partially adjusted catalogues, created-but-reported-failed imports, and unsafe retries.
- **Exploit scenario:** Not applicable; an infrastructure/database error during the second step is sufficient.
- **Reproduction:** Stub `calculate_product_price` or the second update to fail after the initial write; observe committed first-step data and a success/ambiguous error path.
- **Recommended fix:** Move each logical operation into a transaction-backed RPC; propagate every RPC/update error; return actual affected counts and idempotent import results.
- **Regression tests:** Failure-injection integration tests proving full rollback for create, PATCH repricing, bulk adjustment, and import.
- **Estimated effort:** Large

### M-04 — Uploaded media is auto-published without authoritative content inspection

- **Severity:** Medium
- **Confidence:** High
- **Category:** Upload security / privacy
- **File and line:** client signature check `app/admin/media-gallery/SectionGallery.tsx:108`–`:127`; metadata-only server check `app/api/admin/media/route.ts:143`–`:152`; auto-approval `:194`–`:203`; upload bytes `app/api/admin/media/upload/route.ts:63`–`:80`
- **Affected flow:** Product and website-section media publication
- **Evidence:** The browser checks magic bytes, but callers can bypass browser code. Server registration validates declared MIME/size without reading the direct-upload object. The server-upload path reads bytes but does not inspect signatures, decode/re-encode, strip EXIF, or scan malware. Both paths set `review_status = 'approved'` immediately.
- **Root cause:** Quarantine is a database label, not a processing pipeline; approval is coupled to registration.
- **Impact:** Spoofed/corrupt files, retained camera metadata including possible GPS, unoptimized assets, and unsafe objects can be exposed through the public R2 base URL.
- **Exploit scenario:** Authorized or compromised staff client uploads arbitrary bytes under an allowed signed MIME type, registers the object, and receives automatic approval.
- **Reproduction:** In an isolated bucket, bypass the UI, upload a mismatched-signature object with an allowed content type, register it, and query the public URL.
- **Recommended fix:** Keep uploads private/pending; use an R2 event Worker to verify magic bytes, fully decode and re-encode images, strip metadata, probe video, scan malware, and publish a clean derivative only after success.
- **Regression tests:** Mismatch, polyglot, corrupt file, EXIF/GPS stripping, malware-test fixture, video duration, failed-worker, and clean-publish integration cases.
- **Estimated effort:** Large

### M-05 — Website image limits disagree with presign validation

- **Severity:** Medium
- **Confidence:** High
- **Category:** Functional correctness / UX
- **File and line:** `src/lib/site-sections.ts:49`–`:65`; `src/lib/product-media-policy.ts:4` and `:42`; `app/api/admin/media/presign/route.ts:46`–`:59`
- **Affected flow:** Admin website-section image upload
- **Evidence:** Every section image allows 5 MB in `SITE_SECTIONS`, and the gallery validates against that contract. Presign then applies the product-media policy to every upload, rejecting images above 3 MB even when there is no `productId`.
- **Root cause:** Presign route does not receive/use `sectionKey`; unrelated product policy is applied globally.
- **Impact:** Valid 3–5 MB hero/banner/gallery images fail with a misleading product-media error after local decoding/validation.
- **Exploit scenario:** Not applicable.
- **Reproduction:** Select a correctly dimensioned 4 MB JPEG for any website section; client validation passes, presign returns 422 `media_limit`.
- **Recommended fix:** Include `sectionKey` in presign schema and validate with the matching section policy; apply product policy only for product uploads.
- **Regression tests:** Presign tests for 3–5 MB section image acceptance, >5 MB rejection, product 3 MB ceiling, and section MIME/dimension contract.
- **Estimated effort:** Small

### M-06 — Browser CI silently targets production when its variable is absent

- **Severity:** Medium
- **Confidence:** High
- **Category:** CI/CD / test isolation
- **File and line:** `playwright.config.ts:3`; `.github/workflows/quality-gates.yml:32`–`:35`
- **Affected flow:** Pull-request browser verification
- **Evidence:** Empty/unset `E2E_BASE_URL` falls back to the deployed Vercel URL. The workflow does not start the PR build, so tests can pass against old production code rather than the commit under review.
- **Root cause:** Remote production URL used as an implicit default instead of requiring an explicit isolated target.
- **Impact:** False-green PRs; production availability affects CI; future state-changing E2E additions could touch live data.
- **Exploit scenario:** Not applicable.
- **Reproduction:** Run `npm run test:browser` without `E2E_BASE_URL`; inspect the target URL.
- **Recommended fix:** Default to localhost, start `npm run start` in CI after build, wait for readiness, and fail fast if CI lacks an explicit non-production target.
- **Regression tests:** Config test asserting CI rejects empty/production base URLs; workflow smoke test against the built artifact.
- **Estimated effort:** Small

### M-07 — Catalogue outage takes down unrelated content routes and creates soft 404s

- **Severity:** Medium
- **Confidence:** High
- **Category:** Reliability / SEO
- **File and line:** `app/[[...slug]]/page.tsx:33`–`:49`
- **Affected flow:** Home, contact, policies, FAQ, blog, store locator, unknown URLs, product routes
- **Evidence:** The page loads catalogue before route classification. In production, null catalogue immediately returns a generic `<main>` response. Content-only routes never render, and unknown paths never reach `notFound()`, so they return HTTP 200 during the outage.
- **Root cause:** Global catch-all availability coupled to catalogue availability.
- **Impact:** Supabase catalogue failure becomes a full storefront/content outage; crawlers receive temporary soft 404/soft-success responses.
- **Exploit scenario:** Not applicable.
- **Reproduction:** Run production with missing/unavailable Supabase configuration and request `/contact` and a random path; both return the catalogue-unavailable page before route-specific handling.
- **Recommended fix:** Resolve/validate the route first; require catalogue only for catalogue-dependent pages; use a proper 503 response/error boundary for catalogue pages and preserve 404 semantics.
- **Regression tests:** Storage-outage E2E for static content 200, catalogue routes 503/fallback as designed, and unknown route 404.
- **Estimated effort:** Medium

### M-08 — Full catalogue, media, and reviews are repeatedly transferred to every active client

- **Severity:** Medium
- **Confidence:** High
- **Category:** Performance / scalability
- **File and line:** `src/lib/catalogue-server.ts:42`–`:101`; `src/App.tsx:72`–`:147`; `app/api/catalogue/route.ts:4`–`:15`
- **Affected flow:** Every storefront session and every product/media Realtime event
- **Evidence:** `getPublishedCatalogue()` selects every product, all approved media links, and all approved review bodies without limits. `/api/catalogue` is force-dynamic/no-store. Each visible client repeats the full fetch every 60 seconds and on any product/media/link change.
- **Root cause:** Snapshot endpoint used as both page bootstrap and global synchronization protocol.
- **Impact:** Database work, response size, client parsing, and bandwidth scale with `active clients × catalogue size`; a single update causes a thundering refresh across connected clients.
- **Exploit scenario:** Not applicable.
- **Reproduction:** Keep multiple pages visible and observe `/api/catalogue` every 60 seconds; update one media row and observe each subscriber fetch the complete dataset.
- **Recommended fix:** Cache/version catalogue responses, use ETag or ISR/revalidation, debounce Realtime events, separate listing summaries from product details/reviews, and paginate admin/public collections.
- **Regression tests:** Request-count test, ETag/304 test, debounced-event test, payload-size budget, and load test at target catalogue/client counts.
- **Estimated effort:** Medium

## Low

### L-01 — Public grants expose full active product/media rows instead of curated views

- **Severity:** Low
- **Confidence:** High
- **Category:** Data minimization / privacy
- **File and line:** `supabase/migrations/0002_public_read_and_data_integrity.sql:151`–`:174`
- **Affected flow:** Direct anonymous Supabase reads
- **Evidence:** `anon` receives table-wide `SELECT` on `products` and `media`; RLS filters rows, not columns. Callers can request metadata the storefront APIs do not expose, including original filenames and staff UUID references on active media/products.
- **Root cause:** Broad base-table grants retained alongside curated public views.
- **Impact:** Avoidable metadata/inventory exposure and a larger future leak surface when columns are added.
- **Exploit scenario:** Anonymous caller queries active rows directly through PostgREST and selects all granted columns.
- **Reproduction:** Query `/rest/v1/media?select=*` with the anon key in an isolated project.
- **Recommended fix:** Revoke base-table `SELECT` from anon; grant curated security-invoker views or explicit safe columns only.
- **Regression tests:** Anonymous column-access matrix; verify public views still serve required storefront fields.
- **Estimated effort:** Small

### L-02 — Most authenticated API handlers parse unbounded request bodies

- **Severity:** Low
- **Confidence:** High
- **Category:** API robustness
- **File and line:** representative `app/api/admin/products/import/route.ts:137`–`:153`, `app/api/admin/media/upload/route.ts:35`–`:39`; bounded helper only used by the two public routes
- **Affected flow:** Admin product, taxonomy, settings, reviews, PIN, rate, media, bulk, and import mutations
- **Evidence:** 14 handlers call `request.json()` or `request.formData()` before size enforcement. Zod limits fields only after the entire body is buffered. Public routes already use `readJsonWithLimit`, proving an available pattern.
- **Root cause:** Boundary-size control implemented selectively.
- **Impact:** Authenticated/compromised clients can waste memory and CPU; behavior depends on hosting-provider request limits.
- **Exploit scenario:** Staff-token holder submits a very large JSON/multipart body; server buffers it before rejecting fields.
- **Reproduction:** Send an oversized body to an admin JSON handler in an isolated environment and observe parsing occurs before schema rejection.
- **Recommended fix:** Apply per-route byte ceilings before parsing; use streaming multipart limits and align platform limits with documented media limits.
- **Regression tests:** Declared and chunked oversized bodies return 413 for every mutation route.
- **Estimated effort:** Medium

### L-03 — Lint passes with stale suppression directives

- **Severity:** Low
- **Confidence:** High
- **Category:** Maintainability / CI hygiene
- **File and line:** `app/admin/media-gallery/SectionGallery.tsx:275` and `:282`
- **Affected flow:** Lint quality gate
- **Evidence:** `npm run lint` reports two unused `@next/next/no-img-element` disable directives.
- **Root cause:** Project globally disables the rule, leaving local suppressions redundant.
- **Impact:** Warning noise and reduced trust in meaningful lint output.
- **Exploit scenario:** Not applicable.
- **Reproduction:** Run `npm run lint`.
- **Recommended fix:** Remove the two stale directives or re-enable the rule and document deliberate native-image cases.
- **Regression tests:** Run ESLint with `--max-warnings=0` or enforce a warning budget.
- **Estimated effort:** Small

### L-04 — Documentation and verification counts are materially stale

- **Severity:** Low
- **Confidence:** High
- **Category:** Documentation / operations
- **File and line:** `README.md:23`; `docs/qa/QA_STRATEGY.md:7`–`:15`; `supabase/migrations/README.md:5`–`:22` and `:98`
- **Affected flow:** Handoff, release decisions, database deployment
- **Evidence:** README states 148 tests while the suite runs 190. QA strategy states 48 and claims browser checks are absent despite Playwright. Migration guide lists through `0016`/first-run through `0013`, while the repository contains `0017`–`0021` and two `0020` files.
- **Root cause:** Status documents manually duplicated rather than generated/updated with implementation.
- **Impact:** Operators may deploy incomplete migrations or trust obsolete QA/security state.
- **Exploit scenario:** Not applicable.
- **Reproduction:** Compare documented counts/migration list with `npm test` and `supabase/migrations/`.
- **Recommended fix:** Update handoff docs; generate test counts/migration inventory in CI; explicitly document ordering of the two `0020` migrations and `0021` rollout/audit.
- **Regression tests:** Documentation check comparing migration files and recorded inventory; avoid hardcoded volatile test counts.
- **Estimated effort:** Small

---

# 5. Test Coverage Gaps

## Unit

- Product PATCH validation against existing persisted pricing state.
- Presign branching between product media and website-section policies.
- Homepage/settings defensive deserialization.
- Catalogue refresh debounce, cache/version, and failure behavior.
- API byte ceilings for all admin handlers.

## Integration

- Supabase RLS role × AAL matrix.
- Atomic create/update/bulk/import pricing with failure injection.
- Migration chain `0001` through `0021` on a disposable database, including both
  `0020` files, grants, view replacement, and rollback rehearsal.
- Public PostgREST denial after removing direct inserts/selects.
- R2 presign CORS, signed length/type, cleanup, processing, and publication.

## Security

- AAL1 direct PostgREST attempts for every staff policy/RPC.
- Rate-limit bypass tests at both Next and Supabase entry points.
- Upload magic-byte, polyglot, EXIF/GPS, corrupt image/video, malware, and
  public-object lifecycle tests.
- CSRF/origin tests for every state-changing handler, not only the pure helper.
- Secret scan coverage for additional provider token formats and binary files.

## E2E/accessibility

- Authenticated staging admin: password, enrollment, TOTP, logout, reset,
  password/MFA management, idle lock, and role denials.
- Product create/edit/publish/delete, media replacement, section assignment,
  bulk update/import, and moderation.
- Enquiry persistence plus WhatsApp handoff; review pending/moderation flow.
- Keyboard navigation, focus trapping/restoration, error announcements, zoom,
  reduced motion, contrast, and axe coverage across representative routes.
- Catalogue outage/503, database timeout, R2 failure, and retry behavior.

---

# 6. Remediation Roadmap

## Phase 1 — Release blockers

1. Fix **M-01** so required type-check/CI passes.
2. Enforce AAL2 in RLS/RPC authorization (**H-01**).
3. Add disposable Supabase RLS/migration integration tests before policy rollout.
4. Re-run the complete verification checklist.

Dependency: policy changes require an isolated database and AAL1/AAL2 fixtures.

## Phase 2 — Security and correctness

1. Close direct public-write bypasses (**M-02**).
2. Make pricing/import/bulk operations transactional (**M-03**).
3. Implement real media quarantine/processing (**M-04**).
4. Align section/presign policies (**M-05**).
5. Narrow anonymous grants (**L-01**) and add body ceilings (**L-02**).

Dependency: do not revoke public inserts until Next routes have a server-authorized
database write path.

## Phase 3 — Performance and reliability

1. Decouple static/content routes from catalogue availability (**M-07**).
2. Replace full no-store polling with cached/versioned synchronization (**M-08**).
3. Isolate browser CI from production (**M-06**).

## Phase 4 — Maintainability and UX

1. Clear lint warnings (**L-03**).
2. Refresh operational/QA/migration documentation (**L-04**).
3. Complete authenticated E2E and WCAG coverage.

---

# 7. Quick Wins

| Fix | Time |
| --- | ---: |
| Update and type the stale product test fixture (**M-01**) | 15–30 min |
| Remove unused lint directives (**L-03**) | 15 min |
| Require explicit/local `E2E_BASE_URL` and fail on production target (**M-06**) | 30–60 min |
| Pass `sectionKey` into presign and branch policy validation (**M-05**) | 45–60 min |
| Update test counts and migration inventory (**L-04**) | 30–60 min |

---

# 8. Verification Checklist

After fixes:

1. `npm run type-check`
2. `npm run lint` with zero warnings
3. `npm test`
4. `npm run build`
5. Start the built app locally and run
   `E2E_BASE_URL=http://127.0.0.1:<port> npm run test:browser`
6. `npm audit --omit=dev --audit-level=high`
7. Run working-tree and full-history secret scans without printing values.
8. Apply all migrations to a disposable Supabase project from empty state.
9. Test anon/authenticated/editor/admin/super-admin at AAL1 and AAL2 against
   every table and RPC; AAL1 staff writes must fail.
10. Prove direct anon PostgREST enquiry/review inserts fail while Next routes work.
11. Inject pricing failures and prove create/PATCH/bulk/import roll back fully.
12. Upload valid, oversized, spoofed, corrupt, EXIF-bearing, and malware-test
    media; only processed clean derivatives may become public.
13. Verify `/contact`, policy pages, product pages, and unknown routes during
    catalogue outage with correct 200/503/404 semantics.
14. Load-test catalogue synchronization at target product and concurrent-user
    counts; enforce response-size and request-rate budgets.
15. Review final Git diff for secrets, generated files, unrelated changes, and
    migration/documentation drift.

---

# 9. Final Verdict

**Safe to release: No.**

**Blocking release:**

- **H-01:** mandatory TOTP is bypassable at the Supabase/RLS entry point.
- **M-01:** required type-check and CI quality gate fail.

**Minimum fixes before production:**

1. Enforce AAL2 in database policies/RPCs and prove it with an RLS integration matrix.
2. Restore a clean `npm run type-check` and green CI.
3. Before enabling production submissions/uploads at scale, close direct public
   insert bypasses and implement authoritative media quarantine/processing.
4. Run the full checklist against an isolated Supabase/R2 staging environment.
