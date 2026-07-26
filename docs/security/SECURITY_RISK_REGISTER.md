# Security Risk Register

| ID | Severity | Risk | Evidence | Mitigation/status |
|---|---|---|---|---|
| SEC-001 | High | Direct R2 uploads trust client MIME/size until processing | `app/api/admin/media/presign/route.ts` | Pending R2 Worker magic-byte, malware, image/video processing |
| SEC-002 | Medium | Enquiry limiter falls back to process-local storage if Upstash is unavailable | `src/lib/upload-rate-limit.ts` | Safe local fallback; configure Upstash/WAF and alert on fallback |
| SEC-003 | High | Supabase RLS role matrix has no automated regression suite | `supabase/migrations/*.sql` | Add isolated anonymous/viewer/editor/admin/super-admin tests |
| SEC-004 | Medium | Live MFA, lockout, session-expiry, and recovery matrix not executed | `app/admin/login/LoginForm.tsx` | Execute with non-production test users; do not disable MFA in production |
| SEC-005 | Medium | No configured browser accessibility/performance automation | `package.json` | Add Playwright and axe suites before production claim |
| SEC-006 | Medium | Public catalogue database integration has no malformed-row fixture tests | `src/lib/catalogue-data.ts` | Add schema validation and integration fixtures |

No secrets are stored in source or documentation. Previously shared R2 credentials must be rotated before deployment.
