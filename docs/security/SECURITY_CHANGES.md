# Security Changes

## 2026-07-24

- Removed unused browser R2 uploader and unused Supabase/Sanity clients.
- Removed unreferenced legacy source assets.
- Hardened `POST /api/r2-presign` with authentication, strict body validation, MIME allowlisting, 10 MiB limit, MIME-derived extension, rate limiting, request IDs, and safe errors.
- Documented deployment-only controls and remaining direct-upload risks.
