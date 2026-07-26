-- 0004_search_and_pricing.sql
--
-- Two capabilities the schema implied but never provided:
--
--   1. Search. The storefront header has a search box; 0001 gave it nothing but
--      an unindexed ILIKE across a dozen columns.
--   2. Pricing. `price_mode = 'weight_based'` plus making_charges, wastage_percent
--      and gst_percent existed as columns, but nothing ever turned them into a
--      number, so display_price had to be maintained by hand.

-- ---------------------------------------------------------------------------
-- Full-text search
-- ---------------------------------------------------------------------------

-- Weighted so a name match outranks a description match:
--   A name · B sku/hallmark/metal/stone · C taxonomy-ish text · D long description
alter table public.products
  add column search_vector tsvector;

create or replace function public.set_product_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english'::regconfig, coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig,  coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(metal_type, '') || ' ' || coalesce(metal_purity, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(stone_type, '') || ' ' || coalesce(stone_colour, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig,  coalesce(hallmark_code, '') || ' ' || coalesce(certificate_number, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(short_description, '')), 'C') ||
    setweight(to_tsvector('english'::regconfig, array_to_string(tags, ' ')), 'C') ||
    setweight(to_tsvector('english'::regconfig, coalesce(long_description, '')), 'D');
  return new;
end;
$$;

create trigger products_search_vector
  before insert or update of name, sku, metal_type, metal_purity, stone_type,
    stone_colour, hallmark_code, certificate_number, short_description, tags,
    long_description on public.products
  for each row execute function public.set_product_search_vector();

update public.products set search_vector =
    setweight(to_tsvector('english'::regconfig, coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig,  coalesce(sku, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(metal_type, '') || ' ' || coalesce(metal_purity, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(stone_type, '') || ' ' || coalesce(stone_colour, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig,  coalesce(hallmark_code, '') || ' ' || coalesce(certificate_number, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(short_description, '')), 'C') ||
    setweight(to_tsvector('english'::regconfig, array_to_string(tags, ' ')), 'C') ||
    setweight(to_tsvector('english'::regconfig, coalesce(long_description, '')), 'D');

create index products_search_idx on public.products using gin (search_vector);

-- Trigram index for partial-word matching ("necklac", "bangl") which tsquery
-- alone will not satisfy.
create extension if not exists pg_trgm;
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

comment on column public.products.search_vector is
  'Trigger-maintained weighted tsvector over name, sku, materials, tags and descriptions.';

-- ---------------------------------------------------------------------------
-- Search function
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER (the default) so RLS still applies: an anonymous caller can
-- only ever match published rows.
create or replace function public.search_products(
  search_query text default '',
  category_slug text default null,
  collection_slug text default null,
  min_price numeric default null,
  max_price numeric default null,
  sort_key text default 'relevance',
  page_size integer default 24,
  page_offset integer default 0
)
returns table (
  id uuid,
  slug text,
  name text,
  short_description text,
  display_price numeric,
  base_price numeric,
  price_on_request boolean,
  metal_purity text,
  stone_type text,
  rating_average numeric,
  rating_count integer,
  is_featured boolean,
  is_new_arrival boolean,
  is_best_seller boolean,
  category_name text,
  collection_name text,
  relevance real,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with normalised as (
    select
      nullif(btrim(search_query), '') as q,
      -- Clamp so a caller cannot request an unbounded page.
      least(greatest(coalesce(page_size, 24), 1), 100) as lim,
      greatest(coalesce(page_offset, 0), 0) as off
  ),
  matched as (
    select
      p.id, p.slug, p.name, p.short_description, p.display_price, p.base_price,
      p.price_on_request, p.metal_purity, p.stone_type, p.rating_average, p.rating_count,
      p.is_featured, p.is_new_arrival, p.is_best_seller, p.display_order, p.created_at,
      cat.name as category_name,
      col.name as collection_name,
      case
        when n.q is null then 0::real
        else ts_rank(p.search_vector, websearch_to_tsquery('english', n.q))
      end as relevance
    from public.products p
    cross join normalised n
    left join public.taxonomy_terms cat on cat.id = p.category_id
    left join public.taxonomy_terms col on col.id = p.collection_id
    where p.status = 'published'
      and p.deleted_at is null
      and (
        n.q is null
        or p.search_vector @@ websearch_to_tsquery('english', n.q)
        or p.name ilike '%' || n.q || '%'
      )
      and (category_slug is null or cat.slug = category_slug)
      and (collection_slug is null or col.slug = collection_slug)
      and (min_price is null or coalesce(p.display_price, p.base_price) >= min_price)
      and (max_price is null or coalesce(p.display_price, p.base_price) <= max_price)
  ),
  counted as (
    select count(*) as total from matched
  )
  select
    m.id, m.slug, m.name, m.short_description, m.display_price, m.base_price,
    m.price_on_request, m.metal_purity, m.stone_type, m.rating_average, m.rating_count,
    m.is_featured, m.is_new_arrival, m.is_best_seller,
    m.category_name, m.collection_name, m.relevance,
    counted.total as total_count
  from matched m
  cross join counted
  order by
    case when sort_key = 'relevance'  then m.relevance end desc nulls last,
    case when sort_key = 'price_asc'  then coalesce(m.display_price, m.base_price) end asc nulls last,
    case when sort_key = 'price_desc' then coalesce(m.display_price, m.base_price) end desc nulls last,
    case when sort_key = 'rating'     then m.rating_average end desc nulls last,
    case when sort_key = 'newest'     then m.created_at end desc nulls last,
    m.display_order asc,
    m.name asc
  limit (select lim from normalised)
  offset (select off from normalised);
$$;

comment on function public.search_products is
  'Storefront catalogue search. SECURITY INVOKER so RLS restricts anonymous callers to published rows. page_size is clamped to 100.';

grant execute on function public.search_products to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Weight-based pricing
-- ---------------------------------------------------------------------------

-- metal_value = weight x rate x (1 + wastage%)
-- subtotal    = metal_value + making_charges
-- total       = subtotal x (1 + gst%)  then discount applied
create or replace function public.calculate_product_price(product_id uuid)
returns table (
  metal_value numeric,
  making_charges numeric,
  wastage_value numeric,
  subtotal numeric,
  gst_value numeric,
  discount_value numeric,
  total numeric,
  rate_per_gram numeric,
  rate_effective_at timestamptz,
  is_priceable boolean
)
language plpgsql
stable
set search_path = public
as $$
declare
  p record;
  v_rate numeric;
  v_effective timestamptz;
  v_weight numeric;
  v_metal numeric := 0;
  v_wastage numeric := 0;
  v_subtotal numeric := 0;
  v_gst numeric := 0;
  v_discount numeric := 0;
begin
  select * into p from public.products where id = product_id;
  if not found then
    return;
  end if;

  if p.price_mode = 'on_request' or p.price_on_request then
    return query select 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric,
                        null::numeric, null::timestamptz, false;
    return;
  end if;

  if p.price_mode = 'fixed' then
    v_subtotal := coalesce(p.base_price, 0);
    v_gst := round(v_subtotal * coalesce(p.gst_percent, 0) / 100, 2);
    v_discount := case
      when p.discount_type = 'flat' then least(coalesce(p.discount_value, 0), v_subtotal + v_gst)
      when p.discount_type = 'percentage' then round((v_subtotal + v_gst) * coalesce(p.discount_value, 0) / 100, 2)
      else 0
    end;
    return query select 0::numeric, 0::numeric, 0::numeric, v_subtotal, v_gst, v_discount,
                        greatest(v_subtotal + v_gst - v_discount, 0), null::numeric, null::timestamptz, true;
    return;
  end if;

  -- weight_based
  v_weight := coalesce(p.net_weight_grams, p.metal_weight_grams, p.gross_weight_grams);
  if v_weight is null or v_weight <= 0 then
    return query select 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric,
                        null::numeric, null::timestamptz, false;
    return;
  end if;

  select mr.rate_per_gram, mr.effective_at into v_rate, v_effective
  from public.metal_rates mr
  where mr.metal = p.metal_type and mr.purity = p.metal_purity;

  if v_rate is null then
    -- No rate on file: the caller must fall back to "price on request" rather
    -- than showing a wrong number.
    return query select 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric,
                        null::numeric, null::timestamptz, false;
    return;
  end if;

  v_metal   := round(v_weight * v_rate, 2);
  v_wastage := round(v_metal * coalesce(p.wastage_percent, 0) / 100, 2);
  v_subtotal := v_metal + v_wastage + coalesce(p.making_charges, 0);
  v_gst := round(v_subtotal * coalesce(p.gst_percent, 0) / 100, 2);
  v_discount := case
    when p.discount_type = 'flat' then least(coalesce(p.discount_value, 0), v_subtotal + v_gst)
    when p.discount_type = 'percentage' then round((v_subtotal + v_gst) * coalesce(p.discount_value, 0) / 100, 2)
    else 0
  end;

  return query select v_metal, coalesce(p.making_charges, 0), v_wastage, v_subtotal, v_gst, v_discount,
                      greatest(v_subtotal + v_gst - v_discount, 0), v_rate, v_effective, true;
end;
$$;

comment on function public.calculate_product_price(uuid) is
  'Breaks a product price into metal, wastage, making, GST and discount. Returns is_priceable = false when a rate is missing rather than guessing.';

grant execute on function public.calculate_product_price(uuid) to anon, authenticated;

-- Recompute display_price for every weight_based product using a metal/purity
-- pair. Called by the rate-change trigger below and safe to run manually.
create or replace function public.refresh_weight_based_prices(target_metal text, target_purity text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
  r record;
  calc record;
begin
  for r in
    select id from public.products
    where price_mode = 'weight_based'
      and metal_type = target_metal
      and metal_purity = target_purity
      and deleted_at is null
  loop
    select * into calc from public.calculate_product_price(r.id);
    if calc.is_priceable then
      update public.products
         set display_price = calc.total,
             price_on_request = false
       where id = r.id;
      v_updated := v_updated + 1;
    else
      update public.products
         set price_on_request = true
       where id = r.id;
    end if;
  end loop;

  return v_updated;
end;
$$;

comment on function public.refresh_weight_based_prices(text, text) is
  'Recomputes display_price for weight_based products after a metal rate change.';

create or replace function public.on_metal_rate_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_weight_based_prices(new.metal, new.purity);
  return new;
end;
$$;

-- Runs after 0002's history trigger; both are AFTER triggers on the same table
-- and fire in name order, which is irrelevant here since they do not conflict.
create trigger metal_rates_reprice
  after insert or update of rate_per_gram on public.metal_rates
  for each row execute function public.on_metal_rate_changed();

-- ---------------------------------------------------------------------------
-- Public catalogue view
-- ---------------------------------------------------------------------------

-- security_invoker keeps RLS in force for whoever queries the view; without it
-- the view would run as its owner and leak drafts.
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
    cat.name as category_name,
    cat.slug as category_slug,
    col.name as collection_name,
    col.slug as collection_slug,
    primary_media.storage_key as primary_image_key,
    primary_media.alt_text as primary_image_alt
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

comment on view public.catalogue_products is
  'Denormalised published catalogue with category, collection and primary image. security_invoker keeps RLS in force.';
