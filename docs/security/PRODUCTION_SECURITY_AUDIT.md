# Production Security Audit

**Date:** 2026-07-24
**Scope:** PS Jewellers Next.js storefront, runtime configuration, and the R2 presign API.

## Verified findings and remediation

| ID | Finding | Risk | Resolution | Evidence |
|---|---|---|---|---|
| SEC-001 | Presign endpoint could mint upload URLs without access control. | High | Requires a constant-time comparison against `R2_UPLOAD_ADMIN_TOKEN`. | `app/api/r2-presign/route.ts` |
| SEC-002 | No file-size cap was enforced before presigning. | High | Enforces a 10 MiB maximum and pins `ContentLength` into the signed request. | `src/lib/upload-policy.ts`, `src/lib/r2-server.ts` |
| SEC-003 | Object extension could derive from a caller-controlled filename. | Medium | Object keys use UUIDs and an extension mapped from an allowlisted MIME type. | `src/lib/upload-policy.ts` |
| SEC-004 | Request payloads and extra fields were not constrained. | Medium | Body is limited to 1 KiB and accepts exactly `contentType` and `fileSize`. | `app/api/r2-presign/route.ts` |
| SEC-005 | IP throttling trusted spoofable `x-forwarded-for`. | Medium | Uses Vercel's normalized forwarding header only; otherwise safely groups traffic. | `src/lib/upload-rate-limit.ts` |
| SEC-006 | Environment example retained unused CMS/database secrets. | Low | Removed obsolete Supabase/Sanity entries; all local `.env.*` files are ignored except the example. | `.env.example`, `.gitignore` |

## Controls in place

- Server-only R2 credentials and admin credential; no client upload helper exists.
- Allowlisted image MIME types: JPEG, PNG, WebP, AVIF.
- UUID object keys, 5-minute presign expiry, and signed content length/type.
- Per-process request rate limit with `429`, `Retry-After`, request ID, and safe log events.
- CSP, `nosniff`, frame denial, referrer policy, and permissions policy headers.
- Stable JSON error envelope without internal error details.

## Validation required before production

1. Set all required `R2_*` variables and a long random `R2_UPLOAD_ADMIN_TOKEN` in the hosting provider.
2. Confirm R2 CORS permits only the production origin and required `PUT` headers.
3. Confirm upload objects are private or served only through the intended public CDN path.
4. Put a shared edge/WAF rate limit in front of `/api/r2-presign` when deployment has more than one instance.
5. Add post-upload malware and magic-byte inspection before publishing user-provided files.
