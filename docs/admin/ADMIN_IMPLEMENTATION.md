# PS Jewellers Admin Control Panel

## Current delivery

The first production foundation is implemented at `/admin`:

- Supabase SSR cookie sessions with server-side user checks.
- Password sign-in followed by a verified Supabase TOTP factor check.
- Role-aware access using `super_admin`, `admin`, `editor`, and `viewer` profiles.
- Supabase/Postgres migration for products, taxonomy, media, product-media links, pages, modules, metal rates, enquiries, and audit logs.
- RLS policies for every admin table; service-role credentials are not used in browser code.
- Dashboard counts loaded from the database.
- Product listing and validated create/list API at `/api/admin/products`.
- Same-origin checks and structured errors on product mutations.

## Setup

1. Create a Supabase project and add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the server environment.
2. Apply `supabase/migrations/0001_admin_foundation.sql` through the Supabase SQL editor or migration pipeline.
3. Create an admin user in Supabase Auth, enroll a TOTP factor, and assign the user a role in `public.profiles`.
4. Start the app and open `/admin`.

The route intentionally shows a setup message when Supabase is missing. It does not use demo credentials, localStorage authorization, or an in-memory database.

## Remaining implementation phases

- Product edit, duplicate, soft-delete, restore, bulk import/export, and PIN step-up verification.
- R2 media pipeline with server-side magic-byte validation, content hashing, optimization variants, usage references, and deletion guards.
- Dynamic page/module editor and public-site data reads.
- Metal-rate recalculation transactions, enquiry management, settings, and immutable audit writes for every mutation.
- Integration, responsive, accessibility, IDOR, upload-abuse, and deployment tests.

These are tracked as incomplete because the acceptance criteria require real database-backed behaviour, not clickable placeholder screens.
