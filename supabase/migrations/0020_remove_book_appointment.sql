-- Remove the Book Appointment feature.
--
-- The /book-appointment route, its footer/hero/store-locator CTAs, and the
-- homepage secondary CTA were removed from the application. Editing the 0005
-- and 0007 seeds only fixes a fresh install; any database already provisioned
-- still holds those rows, so the admin settings form would keep rendering a
-- CTA pointing at a route that now 404s.
--
-- DESTRUCTIVE: this drops public.appointments and every row in it. Confirmed
-- intentional. Take a backup first if you are unsure whether the showroom ever
-- received a request through the old form.

-- 1. Drop the stored secondary CTA keys from the homepage settings blob.
--    Other keys on the row are left untouched.
update public.site_settings
   set value = value - 'secondaryCtaLabel' - 'secondaryCtaHref'
 where setting_key = 'homepage'
   and (value ? 'secondaryCtaLabel' or value ? 'secondaryCtaHref');

-- 2. Remove the CMS page row for the deleted route.
delete from public.pages
 where page_key = 'book-appointment';

-- 3. Drop the appointments table created in 0003_storefront_engagement.sql.
--    Its policies, indexes and triggers go with it.
drop table if exists public.appointments cascade;
