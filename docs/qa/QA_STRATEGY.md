# PS Jewellers QA Strategy

## Scope

Customer showroom browsing, shortlist enquiry creation, WhatsApp handoff, admin authentication, product/media/catalogue management, CRM, metal-rate pricing, Supabase RLS, Cloudflare R2 boundaries, SEO, accessibility, and release operations.

## Current evidence

| Area | Command/evidence | Result | Remaining risk |
|---|---|---|---|
| TypeScript | `npm run type-check` | PASS | Runtime/API/database paths still need integration coverage |
| Unit/security tests | `npm test` | PASS | No disposable Supabase role/RLS test environment |
| Production build | `npm run build` | PASS | Authenticated browser mutation paths require staging fixtures |
| Dependencies | `npm audit --omit=dev --audit-level=high` | PASS: 0 vulnerabilities | Review advisories after dependency updates |
| Database migrations | SQL review through `0022` | PASS in repository | Execute AAL1/AAL2 role matrix on a disposable branch database |
| Accessibility | Playwright smoke assertions | PASS | Full keyboard/manual WCAG audit remains |
| Responsive/browser | Playwright desktop/mobile matrix | PASS | Authenticated flows require staging state |
| Upload content processing | Private R2 quarantine, signature validation, image decode/re-encode and metadata stripping | PASS for images | Videos remain private/pending until a dedicated video scanner publishes them |

## Critical journeys

1. Published product: Supabase row + approved media → public product route → shortlist → enquiry persisted → WhatsApp URL contains stored enquiry number.
2. Draft/deleted product: never appears in catalogue, sitemap, or direct product route.
3. Admin: password → verified TOTP challenge → AAL2 session → role-gated mutation → audit record.
4. Media: authenticated presign → R2 upload → pending metadata → approval → public visibility; replacement retains prior key until approval.
5. Pricing: validated rate/product inputs → transactional recalculation → immutable rate history and enquiry snapshot.

## Release blockers

- No production release until `R2_QUARANTINE_BUCKET_NAME` points to a private bucket and migration `0022` is applied.
- No claim of accessibility, browser compatibility, performance targets, or RLS regression coverage until those suites execute against test fixtures.
- Rotate any previously exposed R2 credentials before production deployment.
