# Supabase migrations

Apply in filename order. Each file is a single logical change set and assumes
every earlier file has already run.

| File | Adds |
| --- | --- |
| `0001_admin_foundation.sql` | Core schema: profiles, taxonomy, products, media, pages, metal rates, enquiries, audit log. RLS enabled with admin-only policies. |
| `0002_public_read_and_data_integrity.sql` | Public read policies, `updated_at` triggers, audit + rate-history triggers, role-escalation guard, indexes. |
| `0003_storefront_engagement.sql` | Appointments, newsletter, moderated reviews, store locations, public enquiry submission. |
| `0004_search_and_pricing.sql` | Full-text + trigram search, `search_products()`, weight-based price calculation, `catalogue_products` view. |
| `0005_seed_reference_data.sql` | Idempotent seed: taxonomy, showroom, CMS page shells, opening metal rates. |
| `0006_media_linking_realtime.sql` | Product-media linking, ordering, and realtime publication. |
| `0007_site_settings.sql` | Database-backed homepage settings. |
| `0008_admin_workflows.sql` | Price history and atomic product-media replacement. |
| `0009_operations_and_workflow.sql` | Reserved inventory, variants, customers, enquiry activities, workflow fields, and product version snapshots. |
| `0010_crm_and_metal_rate_hardening.sql` | CRM lifecycle safeguards, staff assignment validation, rate provenance, scheduling, and safe repricing. |
| `0011_enquiry_pipeline.sql` | Enquiry numbers, product snapshots, consent, attribution, idempotency, and expanded lead statuses. |
| `0012_media_quarantine.sql` | Media review status and pending-upload quarantine before public catalogue use. |
| `0013_enquiry_optional_email.sql` | Allows phone-first enquiries while retaining email validation when supplied. |
| `0014_media_replacements.sql` | Stores prior R2 keys during replacement until the new media is approved. |
| `0015_seed_showroom_catalogue.sql` | Seeds the published showroom products and reconnects registered bundled R2 media. |
| `0016_price_on_request_catalogue.sql` | Removes public numeric pricing and sets every active product to price-on-request mode. |
| `0017_product_care_instructions.sql` | Adds care instructions and refreshes the catalogue projection. |
| `0018_admin_pin_lock.sql` | Adds server-verified idle-lock PIN controls and lockout state. |
| `0019_profiles_rls_rationale.sql` | Documents and hardens profile access policies. |
| `0020_archive_media.sql` | Adds the transactional media archive function. |
| `0021_jewellery_category.sql` | Adds canonical jewellery category classification and audit support. |
| `0022_security_and_atomicity.sql` | Requires AAL2 in database role helpers, removes direct anonymous data access, and adds atomic product write/pricing RPCs. |
| `0023_remove_book_appointment.sql` | Removes the retired appointment table and CMS route data. Destructive; back up first. |

```bash
supabase db push          # or: supabase migration up
```

## Why 0002 exists

`0001` enabled RLS on every catalogue table but only ever created admin
policies. In Postgres, RLS with no matching policy denies by default — so an
anonymous storefront visitor could read **nothing**. The site still serves from
`src/data.ts`, which is why this was not visible. The first read against Supabase
would have returned zero rows on every page.

`0002` also fixes three things that existed as columns but were never
maintained: `updated_at` (never advanced past insert), `audit_logs` (never
written), and `metal_rate_history` (never written).

## Access model

Two helper functions from `0001` drive every policy. Both are `security definer`
with a pinned `search_path`, which is what stops the `profiles` policies from
recursing into themselves:

- `public.is_admin()` — `super_admin`, `admin`
- `public.is_admin_or_editor()` — adds `editor`

| Role | Reads | Writes |
| --- | --- | --- |
| `anon` | Server-curated Next API/page responses; active stores only where explicitly granted | None directly on engagement or catalogue base tables |
| `authenticated` (no admin role) | Own profile and explicitly granted public data | Own profile |
| `editor` | All catalogue | Catalogue, media, pages, enquiries, appointments, reviews |
| `admin` | Everything | Above plus metal rates, profiles |
| `super_admin` | Everything | Above plus role assignment |

Public-writable tables never grant `SELECT` to `anon`. A visitor can submit an
enquiry but cannot read the enquiry table back — including their own row.

### Two guards worth knowing about

**Role escalation.** `admins manage profiles` would otherwise let any `admin`
promote themselves to `super_admin`. The `profiles_guard_role_change` trigger
rejects any role change not made by a `super_admin`, and rejects a `super_admin`
changing their own role.

**Audit immutability.** `audit_logs` has no `UPDATE`/`DELETE` policy *and* a
trigger that raises on either. Retention pruning therefore needs the service
role — the trigger has to be dropped and recreated around the delete. That is
intentional; silent audit edits are worse than awkward retention.

## Search

`public.search_products()` is `SECURITY INVOKER`, so RLS still applies and an
anonymous caller can only match published rows. `page_size` is clamped to 100
server-side.

```sql
select * from public.search_products(
  search_query    => 'antique gold necklace',
  category_slug   => 'necklaces',
  sort_key        => 'price_asc',
  page_size       => 24,
  page_offset     => 0
);
```

Matching is `websearch_to_tsquery` over a weighted `tsvector` (name → sku →
materials → descriptions), with an `ILIKE` fallback and a trigram index so
partial words like `bangl` still hit.

## Pricing

`calculate_product_price(uuid)` returns the full breakdown — metal value,
wastage, making charges, GST, discount, total.

```
metal_value = weight × rate_per_gram
wastage     = metal_value × wastage_percent / 100
subtotal    = metal_value + wastage + making_charges
gst         = subtotal × gst_percent / 100
total       = subtotal + gst − discount
```

When no rate exists for a product's metal/purity pair it returns
`is_priceable = false` rather than a wrong number — callers should render "price
on request". Updating a row in `metal_rates` recomputes `display_price` for
every affected `weight_based` product via trigger.

## First-run checklist

1. `supabase db push` (applies every migration through `0022` in filename order)
2. Create the first admin in Supabase Auth, then set the role using the **service
   role** or the SQL editor — the escalation guard blocks self-promotion:
   ```sql
   update public.profiles set role = 'super_admin' where id = '<auth-user-uuid>';
   ```
3. Enrol that account in TOTP. `requireAdmin()` rejects any session below `aal2`,
   so an admin without a verified factor cannot reach `/admin` at all.
4. Re-run `0005` (or set rates in the admin panel) to seed metal rates — the seed
   skips itself when no admin profile exists, because `metal_rates.updated_by` is
   `NOT NULL`.
5. Import the catalogue from `src/data.ts`. Product rows are deliberately not
   seeded by a schema migration.

## Verification status

Syntax-checked against the real PostgreSQL grammar (`pglast` / libpg_query) —
all five files parse clean. **Not** executed against a live database; there was
no Postgres instance available in this environment. Run `supabase db push`
against a branch or local stack before trusting these in production, and check
in particular:

- the `enquiries` `CHECK` constraints in `0003`, which will fail if the table
  already holds rows that violate them (add them `NOT VALID` first if so);
- trigger interaction on `metal_rates`, where `0002` writes history and `0004`
  reprices, both `AFTER` on the same table.
