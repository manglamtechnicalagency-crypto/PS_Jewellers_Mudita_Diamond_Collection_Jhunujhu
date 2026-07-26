# Live Content Control Audit

## Current status

The homepage hero copy is now database-backed:

```text
/admin/settings
  -> PATCH /api/admin/settings
  -> Supabase site_settings.homepage
  -> GET /api/public/settings
  -> src/App.tsx
  -> HomePage.tsx
```

Migrations through `0013_enquiry_optional_email.sql` are applied to the linked Supabase project.

Products and registered R2 media already have authenticated admin APIs and are consumed by the catalogue API when published records exist.

## Remaining unmanaged surfaces

These still require migration into page modules/settings before the administrator can edit them from `/admin`:

- Homepage collection cards, category labels, trust highlights, offers, testimonials, blog cards, and gallery ordering.
- Homepage hero poster/video asset selection; current fallback remains in `src/data.ts`.
- Static copy and imagery in `src/storefront-pages/SimplePage.tsx`.
- Header/footer navigation, logo variants, contact details, and social links.
- Blog/editorial records.
- Store locations and testimonials admin screens.
- Reconcile any remaining `src/data.ts` seed records with Supabase, including taxonomy and media links; `src/data.ts` is development-only fallback data and is not used when production catalogue storage is unavailable.
- Page-module editor for scheduled/reordered homepage and landing-page sections.

## Acceptance rule

Do not remove a static fallback until the equivalent Supabase record, admin mutation, public read path, empty state, and migration verification test exist. “Admin UI exists” is not sufficient; a change must be observable on the public route after the cache/realtime refresh path.
