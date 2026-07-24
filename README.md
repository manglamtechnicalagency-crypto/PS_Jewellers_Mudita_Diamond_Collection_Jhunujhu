# PS Jewellers — Next.js Ecommerce Experience

Next.js App Router + React 19 + TypeScript + Tailwind CSS storefront for PS Jewellers, Bikaner.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run start
```

## Included routes

The catch-all App Router page preserves the existing storefront routes:

- `/`, `/shop`, `/wishlist`, `/cart`, `/checkout`
- `/gold-jewellery`, `/diamond-jewellery`, `/bridal-collection`, `/rings`, `/offers`
- `/product/:slug`
- `/about`, `/contact`, `/faq`, `/blog`, `/privacy-policy`, `/terms`, `/return-policy`

Backend route:

- `POST /api/r2-presign` — authenticated, rate-limited, 10 MB image upload presigning.
- `/admin` — server-protected admin dashboard; requires Supabase configuration, a profile role, and verified TOTP.
- `/api/admin/products` — authenticated product listing and validated creation endpoint.

## Structure

- `app/` — App Router layout, catch-all storefront route, and API route
- `src/components/` — reusable UI components
- `src/storefront-pages/` — existing route-level storefront views
- `src/data.ts` — catalogue and content data
- `src/lib/` — server/client integration helpers
- `supabase/migrations/` — versioned Postgres schema and RLS policies
- `docs/admin/` — admin architecture, setup, and remaining implementation phases
- `docs/security/` — security audit, environment, checklist, and remaining risks
- `archive/legacy-assets/` — preserved but non-runtime assets from the retired photography template
- `public/assets/` — static hero assets
- `.codex/` and `.agents/skills/` — project-local ECC Codex workflow

## Important

Set the variables in `.env.example` in the server environment. Never expose Supabase service-role, R2, or admin credentials through `NEXT_PUBLIC_` variables.

## Complete project context

PS Jewellers is a Next.js 16 App Router storefront for the Mudita Diamond Collection and jewellery showroom experience. It uses React 19, strict TypeScript, Tailwind CSS, Supabase/PostgreSQL for the admin foundation, and Cloudflare R2 for controlled media uploads.

### Current capabilities

- Responsive public storefront with home, shop, category, product, wishlist, cart, checkout-demo, policy, contact, FAQ, blog, and showroom pages.
- Static catalogue/content seed in `src/data.ts` while the Supabase migration is being adopted.
- Protected `/admin` route with Supabase SSR session checks, profile roles, and verified TOTP requirement.
- Database foundation for products, categories/collections, media, page modules, metal rates, enquiries, and audit logs.
- Authenticated product list/create API with strict Zod validation and RLS-backed access.
- Protected R2 presign endpoint with server-side auth, 10 MiB limit, MIME allowlist, generated keys, rate limiting, and safe errors.

### Required setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

For `/admin`, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, apply `supabase/migrations/0001_admin_foundation.sql`, create a Supabase Auth user, verify TOTP, and assign `super_admin` or `admin` in `public.profiles`.

### Validation commands

```powershell
npm run type-check
npm run build
npm audit --omit=dev --audit-level=high
```

Current validation: type checking passes, the production build generates the storefront/admin/API artifacts, and the production dependency audit reports zero vulnerabilities.

### Runtime routes

Public: `/`, `/shop`, `/wishlist`, `/cart`, `/checkout`, category routes, `/product/:slug`, `/about`, `/contact`, `/faq`, `/blog`, `/privacy-policy`, `/terms`, and `/return-policy`.

Admin/API: `/admin`, `/admin/login`, `/admin/products`, `GET/POST /api/admin/products`, and `POST /api/r2-presign`.

### Directory map

```text
app/                    Next.js routes, admin pages, layouts, and API handlers
app/admin/_components/  Admin-only shared UI
src/components/         Shared public storefront UI
src/storefront-pages/   Public route-level views
src/lib/                Supabase, auth, R2, validation, and rate-limit helpers
src/data.ts              Temporary catalogue/content seed source
public/assets/           Runtime public hero media
supabase/migrations/     Versioned PostgreSQL schema and RLS policies
docs/                   Admin, security, and project documentation
archive/legacy-assets/   Preserved non-runtime assets from the retired template
.agents/                Project-local engineering skills
.codex/                 Project-local agent configuration
```

### Documentation index

- [`PRD.md`](PRD.md) — requirements and scope.
- [`Architecture.md`](Architecture.md) — architecture and decisions.
- [`Design.md`](Design.md) — design system.
- [`Rules.md`](Rules.md) — engineering rules.
- [`Phases.md`](Phases.md) — roadmap.
- [`Memory.md`](Memory.md) — verified handoff state.
- [`docs/README.md`](docs/README.md) — directory ownership map.
- [`docs/admin/ADMIN_IMPLEMENTATION.md`](docs/admin/ADMIN_IMPLEMENTATION.md) — admin setup and remaining phases.
- [`docs/security/`](docs/security/) — security audit and deployment controls.

### Production limitations

The full CMS is being delivered in phases. Product edit/duplicate/trash, media optimization and usage guards, module editing, metal-rate recalculation, PIN step-up authorization, and dynamic public reads still require implementation. Direct R2 uploads also require a quarantine/magic-byte/malware pipeline and shared edge rate limiting before untrusted public uploads are enabled.

Built for PS Jewellers by Manglam Technical Agency, Rajasthan — UDYAM-RJ-15-0094091.
