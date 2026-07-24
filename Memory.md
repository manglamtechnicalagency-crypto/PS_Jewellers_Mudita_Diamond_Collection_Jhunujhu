# Project Memory

## Project Snapshot

- **Project:** PS Jewellers storefront
- **Current phase:** Phase 1 — Cleanup, stabilization, and security hardening
- **Status:** In progress; implementation validation is pending.
- **Last updated:** 2026-07-24

## Verified Current State

- Next.js App Router with TypeScript, React, and Tailwind CSS.
- Catalogue content comes from `src/data.ts`; cart, wishlist, and recently viewed items use browser `localStorage`.
- No database, authentication system, real checkout, payment processor, or admin UI is implemented.
- `POST /api/r2-presign` is the only backend endpoint. It authorizes a trusted caller before creating a short-lived R2 upload URL.

## Work Completed This Session

- Removed unused Supabase/Sanity clients, browser upload helper, and their packages.
- Hardened the R2 presign route with constant-time token comparison, strict body validation, MIME/size restriction, UUID/MIME-derived keys, safe response errors, and request rate limiting.
- Added security documentation in `docs/security/` and corrected environment-variable guidance.
- Added Supabase SSR clients, protected `/admin`, role-aware dashboard counts, product list/create API, and the initial Postgres/RLS migration. See `docs/admin/ADMIN_IMPLEMENTATION.md`.
- Organized the repository: archived 18 unused legacy media files under `archive/legacy-assets`, grouped admin-only UI under `app/admin/_components`, and added `docs/README.md` as the documentation map.
- Removed all source references to legacy Vite/Supabase/Sanity upload scaffolding. The unreferenced binary files under `src/assets/` remain pending filesystem removal because the execution environment blocked recursive deletion; they are not imported at runtime.

## Known Limitations and Next Actions

1. Complete build, runtime API, and dependency-audit validation.
2. Update historical root documentation that still describes pre-Next/Vite architecture.
3. Before production uploads: implement shared edge rate limiting and post-upload byte/malware verification; see `docs/security/SECURITY_REMAINING_RISKS.md`.
4. Dependency audit remediation is complete through safe npm overrides; continue monitoring Next.js for native fixes.

## Latest validation

- `npm install`: passed; npm reports 0 vulnerabilities after safe `next` transitive dependency overrides for `postcss` and `sharp`.
- `npm run type-check`: passed.
- `npm run build`: passed after clearing stale project-specific Next dev processes; Next 16 now uses `proxy.ts`.

## Environment

Required variable names are documented in `.env.example` and `docs/security/SECURITY_ENVIRONMENT.md`. No secret values are stored here.
