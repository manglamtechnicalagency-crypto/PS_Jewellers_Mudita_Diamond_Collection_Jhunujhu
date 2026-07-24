# Remaining Security Risks

## Direct-upload content verification — High

The application authorizes an R2 direct upload; file bytes do not traverse the Next.js server. The MIME type and length are constrained in the signed request, but their contents cannot be magic-byte checked by this codebase. Before end-user uploads are enabled, add a quarantine bucket plus an R2 event/Worker that verifies content, scans it, and publishes only approved files.

## Distributed rate limiting — Medium

`src/lib/upload-rate-limit.ts` is deliberately a safe fallback, but its map is process-local. It cannot coordinate limits across multiple serverless instances. Add a shared edge/WAF or Redis-compatible limiter for production horizontal scale.

## Admin token lifecycle — Medium

The endpoint is protected by one server-side admin token. There is no user identity, role model, rotation workflow, or audit sink yet. Use a real authenticated admin session or a short-lived service credential before exposing an upload UI.

## Demo commerce — Informational

Cart data is stored only in browser `localStorage`; checkout never transmits personal data or charges a payment method. A real checkout requires server-side order creation, authenticated payment-provider integration, privacy review, and transactional audit logging.

## Dependency advisories — Resolved for current lockfile

The vulnerable nested `postcss` and `sharp` packages are pinned to patched compatible versions through npm overrides. `npm audit --omit=dev --audit-level=high` currently reports zero vulnerabilities. Keep the overrides until the installed Next.js release adopts safe native ranges.
