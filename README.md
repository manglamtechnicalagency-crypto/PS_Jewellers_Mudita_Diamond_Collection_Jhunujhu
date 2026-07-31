# PS Jewellers

Premium jewellery showroom storefront and admin foundation for PS Jewellers, Jhunjhunu. The project is built with Next.js App Router, React, TypeScript, Tailwind CSS, Supabase, and Cloudflare R2.

[Repository](https://github.com/manglamtechnicalagency-crypto/PS_Jewellers_Mudita_Diamond_Collection_Jhunujhu)

## Overview

The application combines a polished public storefront with a secure foundation for catalogue administration and media uploads.

### Current capabilities

- Responsive home, shop, category, product, cart, wishlist, reservation, policy, contact, FAQ, blog, and showroom pages, verified at 390 / 768 / 1440 / 1920 px.
- **17 catalogue seed pieces** from the July 2026 client photoshoot, each with its own photography, product code, weight and hallmarking. When Supabase is configured, public pages and the sitemap use only published database records; `src/data.ts` remains the development fallback when storage is unavailable.
- 14 categories including Maang Tikka, Nose Pin, Anklets and a cross-cutting Silver Jewellery filter.
- Keyword search across names, tags, materials and occasions, covering regional terms (`jhumka`, `payal`, `nath`, `borla`, `hasli`, `kada`, `rani haar`).
- Per-route SEO: `generateMetadata`, canonical URLs, OpenGraph, `Product` / `JewelryStore` JSON-LD, `sitemap.xml` and `robots.txt`.
- Nonce-based Content-Security-Policy issued per request from `proxy.ts`, with no `unsafe-inline` in `script-src`.
- Protected admin dashboard at `/admin` with Supabase SSR sessions, role checks, and **server-enforced TOTP** — sessions below `aal2` are rejected.
- Product listing and creation API at `/api/admin/products` with Zod validation and database-backed access control.
- Controlled R2 upload presigning at `/api/admin/media/presign` with authentication, MIME validation, generated object keys, per-kind size limits, and rate limiting that fails closed.
- Supabase migrations covering the catalogue, public read policies, storefront engagement tables, search and pricing, reference data, media, site settings, and admin workflows.
- Node unit and security tests over upload policy, rate limiting, CSP construction, CSRF, SEO, catalogue integrity, asset resolution, and bounded request parsing.

### Catalogue status

| | |
| --- | --- |
| Products | 17, all real client inventory |
| Priced from supplied weights | 7 (gold at ₹7,200/g 22K, silver at ₹95/g — **indicative, not client-confirmed**) |
| Price on request | 10 (7 diamond pieces have gold weight only, no carat data; 3 silver pieces have no weight) |
| Customer reviews | None. Previously-seeded reviews were fabricated and have been removed. |

> **Before launch:** confirm the metal rates and making charges with the client, and supply carat weights or retail prices for the diamond pieces. The FAQ, privacy, terms and return pages are one-line summaries and need real policy text.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, TypeScript, Tailwind CSS |
| Data and auth | Supabase, PostgreSQL, Supabase SSR |
| Media uploads | Cloudflare R2, AWS SDK presigned URLs |
| Validation | Zod |
| Deployment target | Any Node.js host compatible with Next.js, including Vercel |

## Quick start

### Requirements

- Node.js 20 or newer
- npm
- Supabase project for admin features
- Cloudflare R2 bucket for protected media uploads

### Install and run

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment configuration

Copy `.env.example` to `.env.local` and fill in the required values. Keep server-only secrets out of variables prefixed with `NEXT_PUBLIC_`.

| Variable group | Purpose | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Also drives `connect-src` in the CSP — omitting it blocks admin sign-in. | Browser-safe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public client key | Browser-safe |
| `SUPABASE_SECRET_KEY` | Privileged server operations | Server-only |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 server integration | Server-only |
| `R2_BUCKET_NAME` | Public clean-media destination bucket | Server-only |
| `R2_QUARANTINE_BUCKET_NAME` | Private upload quarantine bucket; never attach a public domain | Server-only |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public read base URL/CDN. Added to `img-src` and `next/image` `remotePatterns`. | Browser-safe |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap and OpenGraph. Falls back to localhost. | Browser-safe |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared upload rate limiting. Without these the limiter is per-instance. | Server-only |

Never commit `.env`, `.env.local`, service-role keys, R2 secrets, or access tokens.

### Vercel production setup

In the Vercel project settings, add each variable separately and select **Production**. Do not paste `KEY=VALUE` into the key field.

```text
NEXT_PUBLIC_SITE_URL=https://ps-jewellers-mudita-diamond-collect.vercel.app
R2_ACCOUNT_ID=b4648b1e92022a7f612c02a7538d4a57
R2_BUCKET_NAME=ps-jewellers
R2_QUARANTINE_BUCKET_NAME=ps-jewellers-quarantine-prod
```

Also add the Supabase and R2 credentials listed above. `SUPABASE_SECRET_KEY`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` are server-only secrets and must never use a `NEXT_PUBLIC_` prefix. After changing production variables, create a new production deployment; existing deployments do not receive updated environment values.

For shared rate limiting, create a Redis database at [Upstash](https://console.upstash.com), open its **REST API** details, and copy the REST URL and token into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Keep the token server-only.

Verify the deployment:

```powershell
curl.exe https://ps-jewellers-mudita-diamond-collect.vercel.app/api/catalogue
curl.exe https://ps-jewellers-mudita-diamond-collect.vercel.app/api/public/settings
curl.exe https://ps-jewellers-mudita-diamond-collect.vercel.app/api/public/site-media
```

All three endpoints should return HTTP `200` with JSON. If variables were added after the last deployment, redeploy with `npx vercel --prod` or the Vercel dashboard's **Redeploy** action.

## Admin setup

1. Configure the Supabase variables in `.env.local`.
2. Apply every migration in filename order with `supabase db push`. See [the migration guide](supabase/migrations/README.md).
3. Create an authenticated Supabase user.
4. Assign the role using the **service role** or the SQL editor. A trigger blocks self-promotion, so the first `super_admin` cannot be set from the app:
   ```sql
   update public.profiles set role = 'super_admin' where id = '<auth-user-uuid>';
   ```
5. Enrol that account in TOTP. `requireAdmin()` rejects any session below `aal2`, so an admin without a verified factor cannot reach `/admin` at all.
6. Open `/admin/login` and sign in — the form issues a real MFA challenge and asks for the 6-digit code.

`0002` adds the public read policies the storefront needs. Without it, RLS denies by default and anonymous visitors read nothing. Production deployments should also configure the shared rate limiter and an upload quarantine pipeline before allowing broad public upload workflows.

## Routes

### Public storefront

`/`, `/shop`, `/wishlist`, `/cart`, `/checkout`, `/product/:slug`

Category routes: `/gold-jewellery`, `/diamond-jewellery`, `/silver-jewellery`, `/bridal-collection`, `/rings`, `/necklaces`, `/earrings`, `/bangles`, `/bracelets`, `/chains`, `/pendants`, `/mangalsutra`, `/maang-tikka`, `/nose-pin`, `/anklets`, `/new-arrivals`, `/best-sellers`, `/offers`

Content routes: `/about`, `/contact`, `/faq`, `/blog`, `/store-locator`, `/order-tracking`, `/account`, `/privacy-policy`, `/terms`, `/return-policy`

Generated: `/sitemap.xml`, `/robots.txt`

### Admin and API

| Route | Purpose |
| --- | --- |
| `/admin` | Protected admin dashboard |
| `/admin/login` | Admin authentication |
| `/admin/products` | Product management foundation |
| `GET /api/admin/products` | List products for authorized admins |
| `POST /api/admin/products` | Create a validated product |
| `POST /api/admin/media/presign` | Create a controlled R2 upload URL |

## Project structure

```text
app/                    Next.js routes, layouts, admin pages, and API handlers
app/admin/_components/  Shared admin UI
src/components/         Shared storefront components
src/storefront-pages/   Public route-level page views
src/lib/                Auth, Supabase, R2, SEO, CSP, validation, and rate-limit helpers
src/data.ts             Development catalogue fallback; published runtime reads come from Supabase
public/assets/products/ Client product photography and video, one folder per slug
tests/                  Node test-runner unit tests
supabase/migrations/     Versioned PostgreSQL schema and RLS policies
docs/                   Architecture, admin, security, and project documentation
archive/legacy-assets/  Preserved non-runtime assets from the retired template
```

## Quality checks

Run these before opening a pull request or deploying:

```powershell
npm run verify   # type-check, then tests, then build
```

Or individually:

```powershell
npm run type-check
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

`tests/assets.test.ts` fails the build if `src/data.ts` references an image or video that is not present under `public/`, which is how a renamed asset previously shipped as a broken image.

Start the production build locally with:

```powershell
npm run start
```

## Documentation

- [Product requirements](PRD.md)
- [Architecture](Architecture.md)
- [Design system](Design.md)
- [Engineering rules](Rules.md)
- [Delivery phases](Phases.md)
- [Verified handoff state](Memory.md)
- [Documentation map](docs/README.md)
- [Admin implementation guide](docs/admin/ADMIN_IMPLEMENTATION.md)
- [Security checklist](docs/security/SECURITY_CHECKLIST.md)
- [Security changes](docs/security/SECURITY_CHANGES.md)
- [Remaining security risks](docs/security/SECURITY_REMAINING_RISKS.md)
- [Migration guide and access model](supabase/migrations/README.md)
- [Code review, 2026-07-25](docs/review/CODE_REVIEW_2026-07-25.md)

## Production roadmap

The current admin layer is intentionally a foundation.

**Blocking launch**

1. Confirm metal rates, making charges and diamond pricing with the client — current gold and silver figures are indicative.
2. Replace the placeholder FAQ, privacy, terms and return-policy copy with reviewed text.
3. Configure the public enquiry environment and deploy the latest migrations; enquiry forms now persist before opening the configured WhatsApp destination.
4. Set `NEXT_PUBLIC_SITE_URL`, or canonical URLs and the sitemap resolve to localhost.

**Next phases**

Remaining launch work: page-module editing, PIN step-up authorization, and an R2 quarantine worker for magic-byte verification and malware scanning. Dynamic public catalogue reads use the published Supabase view; `src/data.ts` is development-only fallback and is never used when production catalogue storage is unavailable.

## Agency

Built for PS Jewellers by [Manglam Technical Agency](https://github.com/manglamtechnicalagency-crypto), Rajasthan.

**UDYAM:** `UDYAM-RJ-15-0094091`
## Cloudflare R2 media and live catalogue

The public server-rendered catalogue is read from the published, non-deleted Supabase `catalogue_products` view. The browser refreshes through `/api/catalogue`, which uses the same Supabase source of truth and fails closed when unavailable. Cloudflare D1 is an optional export/mirror only and never overrides fresh Supabase publication state. Product images and videos are stored in Cloudflare R2; Supabase `media` and `product_media` keep metadata and links. Admin users with verified MFA can upload through short-lived presigned URLs, register/edit/delete media, and manage products from `/admin/products` and `/admin/media`.

Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_QUARANTINE_BUCKET_NAME`, and `NEXT_PUBLIC_R2_PUBLIC_URL` in the deployment environment. Keep the quarantine bucket private. For the D1 mirror, create the database, run `cloudflare/d1/catalogue_products.sql`, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and `CLOUDFLARE_API_TOKEN`, then trigger the protected `/api/admin/d1-sync` endpoint after the Supabase migrations. The Cloudflare account used during this implementation had no R2 bucket or D1 database available, so no remote resources were created or migrated automatically.
