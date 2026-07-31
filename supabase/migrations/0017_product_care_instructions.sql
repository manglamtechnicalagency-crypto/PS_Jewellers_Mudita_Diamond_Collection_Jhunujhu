alter table public.products
  add column if not exists care_instructions text not null default '';

-- PostgreSQL cannot replace a view when its select list removes or inserts a
-- column. The later classification migration also drops/recreates this view,
-- so keep this migration deterministic for databases created from 0004.
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
