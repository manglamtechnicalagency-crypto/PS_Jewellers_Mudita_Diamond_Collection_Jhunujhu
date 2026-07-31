# Project Memory

> **Current baseline — 2026-07-31:** PS Jewellers is a production-targeted Next.js/Vercel showroom. Supabase/Postgres and Cloudflare R2 are active integrations, not scaffolding. Migrations through `0023` match locally and remotely. The R2 buckets are `ps-jewellers` and private `ps-jewellers-quarantine-prod`. No `appointments` table exists by design.

## Project Snapshot

- **Project:** PS Jewellers storefront
- **Current phase:** Release configuration and production verification
- **Status:** Database and R2 setup complete; Vercel environment/deployment verification remains.
- **Last updated:** 2026-07-31

## Verified Current State

- Next.js App Router with TypeScript, React, and Tailwind CSS.
- Catalogue content comes from `src/data.ts`; cart, wishlist, and recently viewed items use browser `localStorage`.
- Supabase provides authentication, RLS-protected catalogue/settings/enquiry data, admin workflows, and media metadata.
- Cloudflare R2 provides clean and quarantine media buckets; credentials remain server-only.
- Admin routes require role authorization and verified TOTP (`aal2`).
- Checkout remains enquiry/demo UI only; no payment processor, order workflow, or appointments table exists.

## Work Completed

- Removed unused Supabase/Sanity clients, browser upload helper, and their packages.
- Hardened the R2 presign route with constant-time token comparison, strict body validation, MIME/size restriction, UUID/MIME-derived keys, safe response errors, and request rate limiting.
- Added security documentation in `docs/security/` and corrected environment-variable guidance.
- Added Supabase SSR clients, protected `/admin`, role-aware dashboard counts, product list/create API, and the initial Postgres/RLS migration. See `docs/admin/ADMIN_IMPLEMENTATION.md`.
- Applied migrations `0017`–`0023`, including the view recreation fix and removal of the obsolete appointments migration conflict.
- Created and verified the Cloudflare R2 buckets used by production.
- Organized the repository: archived 18 unused legacy media files under `archive/legacy-assets`, grouped admin-only UI under `app/admin/_components`, and added `docs/README.md` as the documentation map.
- Removed all source references to legacy Vite/Supabase/Sanity upload scaffolding. The unreferenced binary files under `src/assets/` remain pending filesystem removal because the execution environment blocked recursive deletion; they are not imported at runtime.

## Known Limitations and Next Actions

1. Add/verify Vercel Production environment variables, including Supabase secret and R2 credentials.
2. Redeploy and verify the three public JSON endpoints return HTTP 200.
3. Before broad production uploads: implement post-upload byte/malware verification; see `docs/security/SECURITY_REMAINING_RISKS.md`.
4. Continue dependency and accessibility monitoring.

## Latest validation

- `npm install`: passed; npm reports 0 vulnerabilities after safe `next` transitive dependency overrides for `postcss` and `sharp`.
- `npm run type-check`: passed.
- `npm run build`: passed after clearing stale project-specific Next dev processes; Next 16 now uses `proxy.ts`.

## Environment

Required variable names are documented in `.env.example` and `docs/security/SECURITY_ENVIRONMENT.md`. No secret values are stored here.
