# Security Release Checklist

- [x] Presign endpoint authenticates server-side.
- [x] Upload MIME type, size, body shape, filename-independent key, and expiry are constrained.
- [x] Responses omit secrets and internal errors.
- [x] Security headers and same-origin API behaviour are configured.
- [x] Secrets and generated TypeScript build metadata are ignored by Git.
- [ ] Production R2 CORS is restricted to approved origin(s).
- [ ] Production rate limiting is enforced by shared edge/WAF infrastructure.
- [ ] Uploaded bytes receive malware and magic-byte verification before publication.
- [ ] Admin access is replaced with a user/session-based authorization model if upload UI ships.
- [ ] Dependency audit and production runtime checks pass in CI.
