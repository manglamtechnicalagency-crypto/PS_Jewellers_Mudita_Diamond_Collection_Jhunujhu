# Requirement Traceability Matrix

| Requirement | Implementation | Automated evidence | Status |
|---|---|---|---|
| Published DB catalogue | `src/lib/catalogue-server.ts`, `app/[[...slug]]/page.tsx` | Build/type-check; code path review | Implemented; DB integration not fixture-tested |
| Draft/deleted products private | Supabase published view, `notFound()` | Migration review | Implemented; RLS regression unverified |
| Shortlist-only business flow | `src/storefront-pages/CheckoutPage.tsx` | Build; manual browser test pending | Implemented; browser unverified |
| Enquiry before WhatsApp | `app/api/public/enquiries/route.ts` | Type-check; persistence requires Supabase fixture | Implemented; integration unverified |
| Idempotent enquiries | Unique key + duplicate recovery | No concurrent integration test | Implemented; concurrency unverified |
| Admin MFA/AAL2 | `src/lib/admin-auth.ts`, `app/admin/login/LoginForm.tsx` | Unit auth helper tests | Implemented; live OTP matrix unverified |
| Product CRUD/workflow | `app/api/admin/products/**` | Build/type-check | Implemented; DB persistence unverified |
| R2 media replacement/deletion guards | `app/api/admin/media/**`, migrations `0012`–`0014` | Build/type-check | Implemented; storage failure paths unverified |
| Dynamic pricing | `calculate_product_price`, metal-rate APIs | Build/type-check | Implemented; financial property tests missing |
| CRM lifecycle | `app/api/admin/enquiries/route.ts` | Build/type-check | Implemented; role/RLS matrix missing |
| Audit trail | `audit_logs`, admin audit route | Build/type-check | Implemented; mutation-by-mutation evidence missing |
| Accessibility/browser/performance | No configured automation | None | Missing verification |
| CI release gates | `.github/workflows/quality-gates.yml` | Workflow definition | Implemented; hosted run pending |
