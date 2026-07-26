create table if not exists catalogue_products (
  id text primary key not null,
  payload text not null,
  updated_at text not null
);
create index if not exists catalogue_products_updated_idx on catalogue_products(updated_at desc);
