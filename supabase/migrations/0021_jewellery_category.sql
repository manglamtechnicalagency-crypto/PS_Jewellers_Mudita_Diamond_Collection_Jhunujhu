-- Primary merchandising classification for the storefront.
--
-- Root cause this migration exists to fix: the storefront had no field that
-- said what a product *is* for merchandising purposes, so `/gold-jewellery`,
-- `/silver-jewellery` and `/diamond-jewellery` were derived from
-- `metal_purity` and free-text tags. A diamond ring mounted in 18K gold has
-- `metal_purity = '18K Gold'`, so it appeared under Gold Jewellery.
--
-- `metal_purity` describes material composition and must never determine the
-- primary storefront category. `jewellery_category` is that category.
--
-- Deliberately additive and reversible:
--   * the column is nullable, so no existing row is invalidated;
--   * nothing is deleted, renamed, or re-keyed;
--   * rows the backfill cannot classify with evidence are left NULL and
--     reported by `public.jewellery_category_audit` for manual review.
--
-- Rollback: see the block at the bottom of this file.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'jewellery_category') then
    create type public.jewellery_category as enum ('gold', 'silver', 'diamond', 'platinum');
  end if;
end
$$;

alter table public.products
  add column if not exists jewellery_category public.jewellery_category;

comment on column public.products.jewellery_category is
  'Primary storefront merchandising category. Independent of metal_purity: a diamond piece set in 18K gold is ''diamond''. Never derive this from metal_purity, name, or tags at read time.';

-- Storefront category pages filter on this plus status, and only published
-- rows are ever read, so the partial index matches the real query shape.
create index if not exists products_jewellery_category_idx
  on public.products (jewellery_category, status)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Deterministic backfill.
--
-- Evidence order matters and mirrors how the catalogue is actually described:
--   1. a real diamond in `stone_type`  → diamond   (a diamond set in gold is
--      still diamond jewellery; "diamond cut" is a finish, not a stone)
--   2. platinum in metal fields        → platinum
--   3. silver in metal fields          → silver
--   4. gold in metal fields            → gold
--   5. anything else                   → left NULL for manual review
--
-- Product name and filename are intentionally not consulted: "Dual-Tone
-- Diamond-Cut Gold Bangles" contains "diamond" and is not diamond jewellery.
-- ---------------------------------------------------------------------------

update public.products
set jewellery_category = 'diamond'
where jewellery_category is null
  and deleted_at is null
  and stone_type ~* '\mdiamonds?\M'
  and stone_type !~* 'diamond[[:space:]-]*cut';

update public.products
set jewellery_category = 'platinum'
where jewellery_category is null
  and deleted_at is null
  and (metal_type ~* '\mplatinum\M' or metal_purity ~* '\mplatinum\M');

update public.products
set jewellery_category = 'silver'
where jewellery_category is null
  and deleted_at is null
  and (metal_type ~* '\msilver\M' or metal_purity ~* '\msilver\M');

update public.products
set jewellery_category = 'gold'
where jewellery_category is null
  and deleted_at is null
  and (metal_type ~* '\mgold\M' or metal_purity ~* '\mgold\M');

-- ---------------------------------------------------------------------------
-- Audit surface. Run `select * from public.jewellery_category_audit;` after
-- deploying; every row with needs_manual_review = true must be classified by
-- hand in Admin → Products before the column can be made NOT NULL.
-- ---------------------------------------------------------------------------

create or replace view public.jewellery_category_audit
with (security_invoker = true) as
  select
    p.id                as product_id,
    p.sku,
    p.name,
    p.status,
    p.metal_type        as old_metal_type,
    p.metal_purity      as old_metal_purity,
    p.stone_type        as old_stone_type,
    p.jewellery_category,
    case
      when p.jewellery_category is null then 'no deterministic evidence'
      when p.stone_type ~* '\mdiamonds?\M'
       and p.stone_type !~* 'diamond[[:space:]-]*cut' then 'stone_type names a diamond'
      when p.metal_type ~* '\mplatinum\M' or p.metal_purity ~* '\mplatinum\M' then 'metal fields name platinum'
      when p.metal_type ~* '\msilver\M'   or p.metal_purity ~* '\msilver\M'   then 'metal fields name silver'
      when p.metal_type ~* '\mgold\M'     or p.metal_purity ~* '\mgold\M'     then 'metal fields name gold'
      else 'set manually'
    end                 as evidence,
    case
      when p.jewellery_category is null then 'none'
      when p.stone_type ~* '\mdiamonds?\M'
       and p.stone_type !~* 'diamond[[:space:]-]*cut' then 'high'
      when p.metal_type ~* '\m(platinum|silver|gold)\M'
        or p.metal_purity ~* '\m(platinum|silver|gold)\M' then 'high'
      else 'manual'
    end                 as confidence,
    (p.jewellery_category is null) as needs_manual_review
  from public.products p
  where p.deleted_at is null;

grant select on public.jewellery_category_audit to authenticated;

-- ---------------------------------------------------------------------------
-- Storefront view. Adding the two columns is what lets the storefront filter
-- on classification instead of inferring it from metal_purity.
-- `publish_at` (0009) already exists and is the publication timestamp; no new
-- timestamp column is introduced.
-- ---------------------------------------------------------------------------

-- DROP then CREATE, not CREATE OR REPLACE: Postgres only allows REPLACE to
-- append columns at the end of the select list, and this adds
-- jewellery_category and publish_at in the middle. REPLACE would fail with
-- "cannot change name of view column". Nothing else in the schema depends on
-- this view, so the drop is safe; it is inside the same transaction, so no
-- reader ever observes it missing.
drop view if exists public.catalogue_products;

create view public.catalogue_products
with (security_invoker = true) as
  select
    p.id,
    p.slug,
    p.name,
    p.short_description,
    p.long_description,
    p.metal_type,
    p.metal_purity,
    p.jewellery_category,
    p.stone_type,
    p.net_weight_grams,
    p.gross_weight_grams,
    p.certification,
    p.hallmark_code,
    p.size_options,
    p.price_mode,
    p.display_price,
    p.base_price,
    p.price_on_request,
    p.discount_type,
    p.discount_value,
    p.stock_status,
    p.stock_quantity,
    p.is_featured,
    p.is_new_arrival,
    p.is_best_seller,
    p.rating_average,
    p.rating_count,
    p.tags,
    p.seo_title,
    p.seo_description,
    p.display_order,
    p.created_at,
    p.publish_at,
    cat.name as category_name,
    cat.slug as category_slug,
    col.name as collection_name,
    col.slug as collection_slug,
    primary_media.storage_key as primary_image_key,
    primary_media.alt_text as primary_image_alt,
    p.care_instructions
  from public.products p
  left join public.taxonomy_terms cat on cat.id = p.category_id
  left join public.taxonomy_terms col on col.id = p.collection_id
  left join lateral (
    select m.storage_key, m.alt_text
    from public.product_media pm
    join public.media m on m.id = pm.media_id
    where pm.product_id = p.id
      and m.is_active
      and m.review_status = 'approved'
      and m.deleted_at is null
    order by (pm.role = 'primary') desc, pm.display_order
    limit 1
  ) primary_media on true
  where p.status = 'published' and p.deleted_at is null;

grant select on public.catalogue_products to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Rollback
--
--   begin;
--   drop view if exists public.jewellery_category_audit;
--   -- Restore the 0017 definition of catalogue_products before dropping the
--   -- column, otherwise the view blocks the drop.
--   \i supabase/migrations/0017_product_care_instructions.sql
--   drop index if exists public.products_jewellery_category_idx;
--   alter table public.products drop column if exists jewellery_category;
--   drop type if exists public.jewellery_category;
--   commit;
--
-- No product row, media link, price, URL, or review is touched by either
-- direction.
-- ---------------------------------------------------------------------------
