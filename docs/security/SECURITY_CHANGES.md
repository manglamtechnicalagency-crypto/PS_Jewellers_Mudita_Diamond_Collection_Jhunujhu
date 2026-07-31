# Security Changes

## 2026-07-24

- Removed unused browser R2 uploader and unused Supabase/Sanity clients.
- Removed unreferenced legacy source assets.
- Hardened `POST /api/admin/media/presign` with authentication, strict body validation, MIME allowlisting, per-kind size limits, MIME-derived extension, rate limiting, and safe errors.
- Documented deployment-only controls and remaining direct-upload risks.
