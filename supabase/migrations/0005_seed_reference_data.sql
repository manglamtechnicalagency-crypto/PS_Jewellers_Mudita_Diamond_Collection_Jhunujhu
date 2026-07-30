-- 0005_seed_reference_data.sql
--
-- Reference data that the storefront currently hardcodes in `src/data.ts`:
-- taxonomy terms, the Jhunjhunu showroom, opening metal rates and the CMS page
-- shells. Product rows are NOT seeded here — the catalogue is client content and
-- belongs in an import script, not a schema migration.
--
-- Every statement is idempotent so this can be re-run against an existing
-- database without duplicating rows.

-- ---------------------------------------------------------------------------
-- Taxonomy: categories
-- ---------------------------------------------------------------------------

insert into public.taxonomy_terms (kind, name, slug, display_order) values
  ('category', 'Gold Rings',       'gold-rings',       10),
  ('category', 'Diamond Rings',    'diamond-rings',    20),
  ('category', 'Earrings',         'earrings',         30),
  ('category', 'Necklaces',        'necklaces',        40),
  ('category', 'Chains',           'chains',           50),
  ('category', 'Pendants',         'pendants',         60),
  ('category', 'Bracelets',        'bracelets',        70),
  ('category', 'Bangles',          'bangles',          80),
  ('category', 'Mangalsutra',      'mangalsutra',      90),
  ('category', 'Bridal Jewellery', 'bridal-jewellery', 100)
on conflict (kind, slug) do update
  set name = excluded.name,
      display_order = excluded.display_order,
      is_active = true;

-- ---------------------------------------------------------------------------
-- Taxonomy: collections (mirrors the four home-page collection cards)
-- ---------------------------------------------------------------------------

insert into public.taxonomy_terms (kind, name, slug, display_order) values
  ('collection', 'Heritage Antique', 'heritage-antique', 10),
  ('collection', 'Celeste Diamonds', 'celeste-diamonds', 20),
  ('collection', 'Maharani Bridal',  'maharani-bridal',  30),
  ('collection', 'Everyday Luxe',    'everyday-luxe',    40)
on conflict (kind, slug) do update
  set name = excluded.name,
      display_order = excluded.display_order,
      is_active = true;

-- ---------------------------------------------------------------------------
-- Showroom
-- ---------------------------------------------------------------------------

insert into public.store_locations (
  name, slug, address_line1, city, state, country_code,
  phone, whatsapp, email, is_primary, is_active, display_order, opening_hours
) values (
  'PS Jewellers — Jhunjhunu',
  'jhunjhunu',
  'Oriental Tower Road No. 1, Shop No. 1',
  'Jhunjhunu',
  'Rajasthan',
  'IN',
  '9829407255',
  '919829407255',
  'subhashsoni334@gmail.com',
  true,
  true,
  10,
  '[
    {"day": "mon", "opens": "10:30", "closes": "20:00"},
    {"day": "tue", "opens": "10:30", "closes": "20:00"},
    {"day": "wed", "opens": "10:30", "closes": "20:00"},
    {"day": "thu", "opens": "10:30", "closes": "20:00"},
    {"day": "fri", "opens": "10:30", "closes": "20:00"},
    {"day": "sat", "opens": "10:30", "closes": "20:00"},
    {"day": "sun", "opens": "11:00", "closes": "18:00"}
  ]'::jsonb
)
on conflict (slug) do update
  set name = excluded.name,
      address_line1 = excluded.address_line1,
      city = excluded.city,
      phone = excluded.phone,
      whatsapp = excluded.whatsapp,
      email = excluded.email,
      opening_hours = excluded.opening_hours,
      is_active = true;

-- ---------------------------------------------------------------------------
-- CMS page shells
-- ---------------------------------------------------------------------------

insert into public.pages (page_key, title, status, seo_title, seo_description) values
  ('home',             'Home',                'published', 'Luxury Gold, Diamond & Bridal Jewellery', 'BIS hallmarked gold, certified diamonds and bridal heirlooms from PS Jewellers, Jhunjhunu.'),
  ('shop',             'Shop All Jewellery',  'published', 'Shop All Jewellery',                       'Browse the full PS Jewellers catalogue with hallmarking and certification details.'),
  ('about',            'About Us',            'published', 'About PS Jewellers',                       'The story behind PS Jewellers, Jhunjhunu.'),
  ('contact',          'Contact',             'published', 'Contact PS Jewellers',                     'Enquiries, appointments and showroom visits.'),
  ('faq',              'FAQ',                 'published', 'Frequently Asked Questions',               'Hallmarking, certification, delivery and exchange questions answered.'),
  ('store-locator',    'Store Locator',       'published', 'Store Locator',                            'Visit the PS Jewellers showroom in Jhunjhunu, Rajasthan.'),
  ('privacy-policy',   'Privacy Policy',      'published', 'Privacy Policy',                           'How PS Jewellers handles your information.'),
  ('terms',            'Terms',               'published', 'Terms and Conditions',                     'Terms for using the PS Jewellers website.'),
  ('return-policy',    'Return Policy',       'published', 'Return Policy',                            'Exchange and return terms.')
on conflict (page_key) do update
  set title = excluded.title,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description;

-- ---------------------------------------------------------------------------
-- Opening metal rates
-- ---------------------------------------------------------------------------
--
-- metal_rates.updated_by is NOT NULL and references profiles, so rates can only
-- be seeded once at least one admin profile exists. Skipped silently on a fresh
-- database; re-run this migration after creating the first admin, or set the
-- rates from the admin panel.

do $$
declare
  v_admin uuid;
begin
  select id into v_admin
  from public.profiles
  where role in ('super_admin', 'admin')
  order by created_at
  limit 1;

  if v_admin is null then
    raise notice 'No admin profile found — skipping metal rate seed. Set rates from the admin panel after creating an admin.';
    return;
  end if;

  insert into public.metal_rates (metal, purity, rate_per_gram, updated_by, manual_override) values
    ('Gold',     '24K', 7850.0000, v_admin, true),
    ('Gold',     '22K', 7200.0000, v_admin, true),
    ('Gold',     '18K', 5900.0000, v_admin, true),
    ('Gold',     '14K', 4600.0000, v_admin, true),
    ('Silver',   '925', 95.0000,   v_admin, true),
    ('Platinum', '950', 3100.0000, v_admin, true)
  on conflict (metal, purity) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Post-migration checklist
-- ---------------------------------------------------------------------------
--
--   1. Create the first admin user in Supabase Auth, then:
--        update public.profiles set role = 'super_admin' where id = '<uuid>';
--      The role guard in 0002 blocks self-promotion, so this first assignment
--      must be made with the service role or directly in the SQL editor.
--   2. Enrol that account in TOTP. `requireAdmin()` rejects any session below
--      aal2, so an admin without a verified factor cannot reach /admin.
--   3. Re-run this migration (or set rates in the admin panel) to seed metal rates.
--   4. Import the catalogue from `src/data.ts`; product rows are intentionally
--      not seeded by a schema migration.
