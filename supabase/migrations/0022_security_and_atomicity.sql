-- Align the database authorization boundary with the application's mandatory
-- TOTP gate, remove bypassable anonymous table access, and make product pricing
-- workflows single-statement transactions.

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role in ('super_admin', 'admin', 'editor')
    );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role in ('super_admin', 'admin')
    );
$$;

revoke all on function public.is_admin_or_editor() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin_or_editor() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Public submissions now go through bounded, rate-limited Next routes using the
-- server-only service key. Direct PostgREST writes would bypass those controls.
-- Engagement tables were introduced separately and may be absent on databases
-- upgraded from the original catalogue-only schema. Guard each optional object;
-- REVOKE and DROP POLICY otherwise raise 42P01 before the core hardening runs.
do $$
begin
  if to_regclass('public.enquiries') is not null then
    execute 'revoke insert on public.enquiries from anon';
    execute 'drop policy if exists "public submits enquiries" on public.enquiries';
  end if;
  if to_regclass('public.product_reviews') is not null then
    execute 'revoke insert on public.product_reviews from anon';
    execute 'drop policy if exists "public submits reviews" on public.product_reviews';
  end if;
  if to_regclass('public.appointments') is not null then
    execute 'revoke insert on public.appointments from anon';
    execute 'drop policy if exists "public requests appointments" on public.appointments';
  end if;
  if to_regclass('public.newsletter_subscribers') is not null then
    execute 'revoke insert on public.newsletter_subscribers from anon';
    execute 'drop policy if exists "public subscribes to newsletter" on public.newsletter_subscribers';
  end if;
end;
$$;

-- Storefront reads are server-curated. Do not expose full base-table rows and
-- future columns through the browser-safe anonymous role.
revoke select on public.products from anon;
revoke select on public.product_media from anon;
revoke select on public.media from anon;
revoke select on public.taxonomy_terms from anon;
revoke select on public.pages from anon;
revoke select on public.page_modules from anon;
revoke select on public.metal_rates from anon;
do $$
begin
  if to_regclass('public.product_reviews') is not null then
    execute 'revoke select on public.product_reviews from anon';
  end if;
  if to_regclass('public.product_reviews_public') is not null then
    execute 'revoke select on public.product_reviews_public from anon';
  end if;
end;
$$;
revoke select on public.catalogue_products from anon;
revoke select on public.site_settings from anon;

-- One allowlisted patch function handles create/update and recalculates the
-- derived display price before the statement can commit. jsonb_populate_record
-- starts from the current row, so omitted patch fields remain unchanged while
-- explicit nulls keep PATCH semantics.
create or replace function public.save_product_atomic(
  p_product_id uuid,
  p_update jsonb
)
returns public.products
language plpgsql
set search_path = public
as $$
declare
  v_allowed constant text[] := array[
    'sku','slug','name','short_description','long_description','care_instructions',
    'category_id','subcategory_id','collection_id','jewellery_category',
    'metal_type','metal_purity','metal_weight_grams','gross_weight_grams',
    'net_weight_grams','stone_type','stone_carat','stone_clarity','stone_colour',
    'stone_count','certification','certificate_number','hallmark_code','size_options',
    'price_mode','base_price','making_charges','wastage_percent','gst_percent',
    'discount_type','discount_value','stock_quantity','reserved_quantity',
    'low_stock_threshold','stock_status','workflow_status','publish_at','is_featured',
    'is_new_arrival','is_best_seller','status','display_order','tags','seo_title',
    'seo_description','seo_keywords'
  ];
  v_bad_key text;
  v_current public.products;
  v_next public.products;
  v_saved public.products;
  v_price record;
begin
  if not public.is_admin_or_editor() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_update) <> 'object' then
    raise exception 'product update must be an object' using errcode = '22023';
  end if;
  select key into v_bad_key
  from jsonb_object_keys(p_update) as keys(key)
  where not (key = any(v_allowed))
  limit 1;
  if v_bad_key is not null then
    raise exception 'unsupported product field: %', v_bad_key using errcode = '22023';
  end if;

  if p_product_id is null then
    v_next := jsonb_populate_record(null::public.products, p_update);
    insert into public.products (
      sku, slug, name, short_description, long_description, care_instructions,
      category_id, subcategory_id, collection_id, jewellery_category,
      metal_type, metal_purity, metal_weight_grams, gross_weight_grams,
      net_weight_grams, stone_type, stone_carat, stone_clarity, stone_colour,
      stone_count, certification, certificate_number, hallmark_code, size_options,
      price_mode, base_price, making_charges, wastage_percent, gst_percent,
      discount_type, discount_value, stock_quantity, stock_status, status,
      workflow_status, publish_at, is_featured, is_new_arrival, is_best_seller,
      display_order, tags, seo_title, seo_description, seo_keywords,
      created_by, updated_by
    ) values (
      v_next.sku, v_next.slug, v_next.name, coalesce(v_next.short_description, ''),
      coalesce(v_next.long_description, ''), coalesce(v_next.care_instructions, ''),
      v_next.category_id, v_next.subcategory_id, v_next.collection_id,
      v_next.jewellery_category, coalesce(v_next.metal_type, ''),
      coalesce(v_next.metal_purity, ''), v_next.metal_weight_grams,
      v_next.gross_weight_grams, v_next.net_weight_grams,
      coalesce(v_next.stone_type, ''), v_next.stone_carat,
      coalesce(v_next.stone_clarity, ''), coalesce(v_next.stone_colour, ''),
      v_next.stone_count, coalesce(v_next.certification, ''),
      coalesce(v_next.certificate_number, ''), coalesce(v_next.hallmark_code, ''),
      coalesce(v_next.size_options, '[]'::jsonb), coalesce(v_next.price_mode, 'fixed'::public.price_mode),
      v_next.base_price, coalesce(v_next.making_charges, 0),
      coalesce(v_next.wastage_percent, 0), coalesce(v_next.gst_percent, 3),
      v_next.discount_type, coalesce(v_next.discount_value, 0),
      coalesce(v_next.stock_quantity, 0), coalesce(v_next.stock_status, 'in_stock'),
      coalesce(v_next.status, 'draft'::public.content_status), coalesce(v_next.workflow_status, 'draft'),
      v_next.publish_at, coalesce(v_next.is_featured, false),
      coalesce(v_next.is_new_arrival, false), coalesce(v_next.is_best_seller, false),
      coalesce(v_next.display_order, 0), coalesce(v_next.tags, '{}'::text[]),
      coalesce(v_next.seo_title, ''), coalesce(v_next.seo_description, ''),
      coalesce(v_next.seo_keywords, '{}'::text[]), (select auth.uid()), (select auth.uid())
    ) returning * into v_saved;
  else
    select * into v_current from public.products
    where id = p_product_id and deleted_at is null
    for update;
    if not found then
      raise exception 'product not found' using errcode = 'P0002';
    end if;
    v_next := jsonb_populate_record(v_current, p_update);
    update public.products set
      sku=v_next.sku, slug=v_next.slug, name=v_next.name,
      short_description=v_next.short_description, long_description=v_next.long_description,
      care_instructions=v_next.care_instructions, category_id=v_next.category_id,
      subcategory_id=v_next.subcategory_id, collection_id=v_next.collection_id,
      jewellery_category=v_next.jewellery_category, metal_type=v_next.metal_type,
      metal_purity=v_next.metal_purity, metal_weight_grams=v_next.metal_weight_grams,
      gross_weight_grams=v_next.gross_weight_grams, net_weight_grams=v_next.net_weight_grams,
      stone_type=v_next.stone_type, stone_carat=v_next.stone_carat,
      stone_clarity=v_next.stone_clarity, stone_colour=v_next.stone_colour,
      stone_count=v_next.stone_count, certification=v_next.certification,
      certificate_number=v_next.certificate_number, hallmark_code=v_next.hallmark_code,
      size_options=v_next.size_options, price_mode=v_next.price_mode,
      base_price=v_next.base_price, making_charges=v_next.making_charges,
      wastage_percent=v_next.wastage_percent, gst_percent=v_next.gst_percent,
      discount_type=v_next.discount_type, discount_value=v_next.discount_value,
      stock_quantity=v_next.stock_quantity, reserved_quantity=v_next.reserved_quantity,
      low_stock_threshold=v_next.low_stock_threshold, stock_status=v_next.stock_status,
      workflow_status=v_next.workflow_status, publish_at=v_next.publish_at,
      is_featured=v_next.is_featured, is_new_arrival=v_next.is_new_arrival,
      is_best_seller=v_next.is_best_seller, status=v_next.status,
      display_order=v_next.display_order, tags=v_next.tags, seo_title=v_next.seo_title,
      seo_description=v_next.seo_description, seo_keywords=v_next.seo_keywords,
      updated_by=(select auth.uid())
    where id = p_product_id
    returning * into v_saved;
  end if;

  if v_saved.price_mode = 'on_request' then
    update public.products set display_price=null, price_on_request=true
    where id=v_saved.id returning * into v_saved;
  else
    -- A product that was previously request-only must be made priceable before
    -- calculate_product_price reads it; that function intentionally refuses
    -- rows whose price_on_request flag is still true.
    update public.products set price_on_request=false
    where id=v_saved.id returning * into v_saved;
    select * into v_price from public.calculate_product_price(v_saved.id);
    if v_price.is_priceable then
      update public.products set display_price=v_price.total, price_on_request=false
      where id=v_saved.id returning * into v_saved;
    else
      update public.products set display_price=null, price_on_request=true
      where id=v_saved.id returning * into v_saved;
    end if;
  end if;
  return v_saved;
end;
$$;

revoke all on function public.save_product_atomic(uuid, jsonb) from public, anon;
grant execute on function public.save_product_atomic(uuid, jsonb) to authenticated;

create or replace function public.bulk_update_products_atomic(
  p_ids uuid[],
  p_change jsonb,
  p_price_adjustment numeric default null
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_row public.products;
  v_count integer := 0;
  v_expected integer;
  v_bad_key text;
begin
  if not public.is_admin_or_editor() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) < 1 or array_length(p_ids, 1) > 100 then
    raise exception 'ids must contain 1 to 100 values' using errcode = '22023';
  end if;
  select key into v_bad_key from jsonb_object_keys(coalesce(p_change, '{}'::jsonb)) as keys(key)
  where key not in ('status','stock_status','tags') limit 1;
  if v_bad_key is not null then
    raise exception 'unsupported bulk field: %', v_bad_key using errcode = '22023';
  end if;
  select count(distinct input_id) into v_expected from unnest(p_ids) as ids(input_id);
  perform 1 from public.products where id=any(p_ids) and deleted_at is null order by id for update;
  if (select count(*) from public.products where id=any(p_ids) and deleted_at is null) <> v_expected then
    raise exception 'one or more products were not found' using errcode = 'P0002';
  end if;
  for v_row in select * from public.products where id=any(p_ids) order by id loop
    if p_price_adjustment is not null and v_row.price_mode <> 'fixed' then
      raise exception 'bulk price adjustments require fixed products' using errcode = '22023';
    end if;
    select * into v_row from public.save_product_atomic(
      v_row.id,
      coalesce(p_change, '{}'::jsonb) ||
      case when p_price_adjustment is null then '{}'::jsonb
           else jsonb_build_object('base_price', greatest(0, coalesce(v_row.base_price,0) + p_price_adjustment)) end
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.bulk_update_products_atomic(uuid[], jsonb, numeric) from public, anon;
grant execute on function public.bulk_update_products_atomic(uuid[], jsonb, numeric) to authenticated;

create or replace function public.import_products_atomic(p_rows jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_item jsonb;
  v_saved public.products;
  v_result jsonb := '[]'::jsonb;
begin
  if not public.is_admin_or_editor() then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 1000 then
    raise exception 'rows must contain 1 to 1000 products' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(p_rows) loop
    select * into v_saved from public.save_product_atomic(null, v_item);
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'id', v_saved.id, 'slug', v_saved.slug, 'name', v_saved.name, 'status', v_saved.status
    ));
  end loop;
  return v_result;
end;
$$;

revoke all on function public.import_products_atomic(jsonb) from public, anon;
grant execute on function public.import_products_atomic(jsonb) to authenticated;
