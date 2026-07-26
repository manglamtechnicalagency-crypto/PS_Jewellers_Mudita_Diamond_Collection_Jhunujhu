-- Fix the pre-existing search trigger before inserting the catalogue. The
-- original function used bare column names, which fail in PL/pgSQL assignment.
create or replace function public.set_product_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english'::regconfig, coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(new.sku, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.metal_type, '') || ' ' || coalesce(new.metal_purity, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.stone_type, '') || ' ' || coalesce(new.stone_colour, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(new.hallmark_code, '') || ' ' || coalesce(new.certificate_number, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.short_description, '')), 'C') ||
    setweight(to_tsvector('english'::regconfig, array_to_string(new.tags, ' ')), 'C') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.long_description, '')), 'D');
  return new;
end;
$$;

-- Idempotent production catalogue seed. Product media was registered in R2
-- before product rows existed; this migration reconnects both datasets.
insert into public.taxonomy_terms (kind, slug, name, is_active)
values
  ('category', 'anklets', 'Anklets', true),
  ('category', 'maang-tikka', 'Maang Tikka', true),
  ('category', 'nose-pin', 'Nose Pin', true),
  ('category', 'silver-jewellery', 'Silver Jewellery', true),
  ('collection', 'oxidised-heritage', 'Oxidised Heritage', true)
on conflict (kind, slug) do update set name = excluded.name, is_active = true;

with seed (sku, slug, name, category_slug, collection_slug, purity, metal_type,
           net_weight_grams, base_price, display_price, price_on_request,
           stock_status, description, tags) as (
  values
    ('PSJ-22K-ER-2001', 'gold-greek-square-diamond-top-earrings', 'Regalia Greek-Key Diamond Tops', 'earrings', 'celeste-diamonds', '22K Gold', 'Gold', 4.840, 40400, 38300, false, 'in_stock', 'A square Greek-key diamond top with a floral centre, made for festive and occasion wear.', array['Earrings','Tops','22K Gold','Festive']),
    ('PSJ-22K-BN-2002', 'dual-tone-diamond-cut-gold-bangles', 'Dual-Tone Diamond-Cut Gold Bangles', 'bangles', 'maharani-bridal', '22K Gold', 'Gold', 32.130, 268300, 254500, false, 'in_stock', 'A pair of dual-tone 22K gold bangles with a twisted diamond-cut pattern for weddings and celebrations.', array['Bangles','22K Gold','Bridal','Wedding']),
    ('PSJ-22K-MS-2003', 'floral-diamond-gold-mangalsutra', 'Elegant Gold Mangalsutra with Floral Pendant', 'mangalsutra', 'everyday-luxe', '22K Gold', 'Gold', 4.870, 40700, 38600, false, 'in_stock', 'A delicate black-bead mangalsutra with a floral-inspired pendant for everyday and festive wear.', array['Mangalsutra','22K Gold','Daily Wear','Wedding']),
    ('PSJ-925-MT-2004', 'oxidised-silver-ruby-maang-tikka', 'Royal Ruby Silver Boriya Maang Tika', 'maang-tikka', 'oxidised-heritage', '925 Sterling Silver', 'Silver', 13.930, 1800, 1700, false, 'in_stock', 'A traditional circular boriya maang tikka in sterling silver with ruby-coloured stones.', array['Maang Tikka','925 Silver','Bridal','Festive']),
    ('PSJ-925-ER-2005', 'oxidised-silver-ruby-jhumka-earrings', 'Rajwadi Oxidised Silver Jhumka Earrings', 'earrings', 'oxidised-heritage', '925 Oxidised Silver', 'Silver', null, null, null, true, 'in_stock', 'Floral Rajwadi jhumka earrings in oxidised 925 silver with ruby-red stone accents.', array['Jhumka','Earrings','925 Silver','Rajwadi']),
    ('PSJ-925-NK-2006', 'oxidised-silver-peacock-long-haar', 'Mayura Oxidised Silver Long Haar', 'necklaces', 'oxidised-heritage', '925 Oxidised Silver', 'Silver', null, null, null, true, 'in_stock', 'A layered peacock long haar with maroon bead cords, ruby-set detail and ghungroo fringe.', array['Long Haar','Necklace','925 Silver','Bridal']),
    ('PSJ-925-NK-2007', 'oxidised-silver-temple-choker', 'Royal Heritage Oxidised Silver Necklace', 'necklaces', 'oxidised-heritage', '925 Oxidised Silver', 'Silver', 48.860, 6300, 5900, false, 'in_stock', 'A broad oxidised silver collar with filigree, colourful stone accents and traditional temple motifs.', array['Choker','Necklace','925 Silver','Temple Jewellery']),
    ('PSJ-18K-ER-2008', 'floral-diamond-stud-earrings', 'Floral Diamond Stud Earrings', 'earrings', 'celeste-diamonds', '18K Gold', 'Gold', null, null, null, true, 'in_stock', 'Refined 18K gold floral stud earrings set with round-cut diamonds.', array['Earrings','Diamond','18K Gold','Daily Wear']),
    ('PSJ-18K-ER-2009', 'infinity-diamond-stud-earrings', 'Elegant Infinity Diamond Stud Earrings', 'earrings', 'celeste-diamonds', '18K Gold', 'Gold', 3.090, null, null, true, 'in_stock', 'An infinity-inspired 18K gold stud design set with diamonds for everyday elegance.', array['Earrings','Diamond','18K Gold','Gifting']),
    ('PSJ-18K-NP-2010', 'diamond-nath-nose-ring', 'Elegant Diamond Nath', 'nose-pin', 'celeste-diamonds', '18K Gold', 'Gold', 2.130, null, null, true, 'in_stock', 'A graceful circular 18K gold nath with round-cut diamonds and a delicate floral accent.', array['Nose Pin','Nath','Diamond','18K Gold']),
    ('PSJ-18K-PD-2011', 'royal-teardrop-diamond-pendant', 'Royal Teardrop Diamond Pendant', 'pendants', 'heritage-antique', '18K Gold', 'Gold', 5.800, null, null, true, 'in_stock', 'An openwork teardrop pendant in 18K gold with a paisley-inspired diamond-set silhouette.', array['Pendant','Diamond','18K Gold','Gifting']),
    ('PSJ-18K-DR-2012', 'square-halo-diamond-ring', 'Elegant Square Halo Diamond Ring', 'diamond-rings', 'celeste-diamonds', '18K Gold', 'Gold', 3.310, null, null, true, 'in_stock', 'A square halo ring in 18K gold with round and baguette-cut diamond detail.', array['Rings','Diamond','18K Gold','Engagement']),
    ('PSJ-18K-RM-2013', 'gold-diamond-halo-ring-mount', '18K Gold Diamond Halo Ring Mount', 'gold-rings', 'celeste-diamonds', '18K Gold', 'Gold', null, null, null, true, 'made_to_order', 'A bespoke-ready 18K gold halo mount designed to hold a round centre stone.', array['Ring Mount','Custom Jewellery','18K Gold','Bespoke']),
    ('PSJ-18K-BR-2014', 'diamond-mangalsutra-bracelet-trio', 'Trio Diamond Mangalsutra Bracelet', 'bracelets', 'everyday-luxe', '18K Gold', 'Gold', null, null, null, true, 'in_stock', 'A black-bead wrist mangalsutra with three diamond stations for meaningful daily wear.', array['Bracelets','Mangalsutra','Diamond','18K Gold']),
    ('PSJ-18K-BR-2015', 'diamond-mangalsutra-bracelet-solitaire', 'Solitaire Diamond Mangalsutra Bracelet', 'bracelets', 'everyday-luxe', '18K Gold', 'Gold', null, null, null, true, 'in_stock', 'A fine black-bead wrist mangalsutra centred by a single halo-set diamond.', array['Bracelets','Mangalsutra','Diamond','18K Gold']),
    ('PSJ-925-AK-2016', 'leaf-pattern-silver-anklets', 'Elegant Leaf Pattern Silver Anklets', 'anklets', 'oxidised-heritage', '925 Sterling Silver', 'Silver', 64.576, 8300, 7900, false, 'in_stock', 'Sterling silver anklets worked into a cascading leaf motif for everyday and festive wear.', array['Anklets','Payal','925 Silver','Festive']),
    ('PSJ-925-AK-2017', 'royal-heritage-oxidised-silver-anklets', 'Royal Heritage Oxidised Silver Anklets', 'anklets', 'oxidised-heritage', '925 Oxidised Silver', 'Silver', 92.560, 11900, 11300, false, 'in_stock', 'Heritage Rajwadi anklets in oxidised sterling silver with enamel accents and dangling detail.', array['Anklets','Payal','925 Silver','Rajwadi'])
)
insert into public.products (
  sku, slug, name, short_description, long_description, category_id, collection_id,
  metal_type, metal_purity, net_weight_grams, base_price, display_price,
  price_on_request, stock_status, stock_quantity, status, workflow_status,
  tags, is_featured, is_new_arrival, is_best_seller, display_order
)
select
  s.sku, s.slug, s.name, s.description, s.description,
  (select id from public.taxonomy_terms where kind = 'category' and slug = s.category_slug),
  (select id from public.taxonomy_terms where kind = 'collection' and slug = s.collection_slug),
  s.metal_type, s.purity, s.net_weight_grams, s.base_price, s.display_price,
  s.price_on_request, s.stock_status, case when s.stock_status = 'in_stock' then 1 else 0 end,
  'published', 'published', s.tags, false, false, false,
  row_number() over (order by s.slug)
from seed s
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  category_id = excluded.category_id,
  collection_id = excluded.collection_id,
  metal_type = excluded.metal_type,
  metal_purity = excluded.metal_purity,
  net_weight_grams = excluded.net_weight_grams,
  base_price = excluded.base_price,
  display_price = excluded.display_price,
  price_on_request = excluded.price_on_request,
  stock_status = excluded.stock_status,
  stock_quantity = excluded.stock_quantity,
  status = 'published',
  workflow_status = 'published',
  tags = excluded.tags,
  updated_at = now();

insert into public.product_media (product_id, media_id, role, display_order)
select p.id, m.id,
  case when m.storage_key like '%/' || p.slug || '/' || p.slug || '-1.%' then 'primary' else 'gallery' end,
  row_number() over (partition by p.id order by m.storage_key) - 1
from public.products p
join public.media m on m.storage_key like 'site/bundled/products/' || p.slug || '/%'
where p.status = 'published' and p.deleted_at is null
  and m.is_active and m.deleted_at is null
on conflict (product_id, media_id) do update set
  role = excluded.role,
  display_order = excluded.display_order;
