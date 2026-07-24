create extension if not exists pgcrypto;

create type public.admin_role as enum ('super_admin', 'admin', 'editor', 'viewer');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.price_mode as enum ('fixed', 'on_request', 'weight_based');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.admin_role not null default 'viewer',
  pin_hash text,
  pin_failed_attempts integer not null default 0 check (pin_failed_attempts >= 0),
  pin_locked_until timestamptz,
  pin_last_rotated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('category', 'collection', 'subcategory')),
  name text not null,
  slug text not null,
  parent_id uuid references public.taxonomy_terms(id) on delete restrict,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(), sku text not null unique, slug text not null unique,
  name text not null, short_description text not null default '', long_description text not null default '',
  category_id uuid not null references public.taxonomy_terms(id) on delete restrict,
  subcategory_id uuid references public.taxonomy_terms(id) on delete restrict,
  collection_id uuid references public.taxonomy_terms(id) on delete restrict,
  metal_type text not null default '', metal_purity text not null default '',
  metal_weight_grams numeric(12,3), gross_weight_grams numeric(12,3), net_weight_grams numeric(12,3),
  stone_type text not null default '', stone_carat numeric(10,3), stone_clarity text not null default '',
  stone_colour text not null default '', stone_count integer check (stone_count is null or stone_count >= 0),
  certification text not null default '', certificate_number text not null default '', hallmark_code text not null default '',
  size_options jsonb not null default '[]'::jsonb, price_mode public.price_mode not null default 'fixed',
  base_price numeric(14,2), making_charges numeric(14,2) not null default 0,
  wastage_percent numeric(6,3) not null default 0 check (wastage_percent >= 0), gst_percent numeric(5,2) not null default 3,
  display_price numeric(14,2), price_on_request boolean not null default false,
  discount_type text check (discount_type is null or discount_type in ('flat', 'percentage')),
  discount_value numeric(14,2) not null default 0, stock_quantity integer not null default 0 check (stock_quantity >= 0),
  stock_status text not null default 'in_stock', is_featured boolean not null default false,
  is_new_arrival boolean not null default false, is_best_seller boolean not null default false,
  status public.content_status not null default 'draft', display_order integer not null default 0,
  tags text[] not null default '{}', related_product_ids uuid[] not null default '{}',
  seo_title text not null default '', seo_description text not null default '', seo_keywords text[] not null default '{}',
  og_image_id uuid, deleted_at timestamptz, deleted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null, updated_by uuid references public.profiles(id) on delete set null
);

create table public.media (
  id uuid primary key default gen_random_uuid(), storage_key text not null unique, original_filename text not null,
  mime_type text not null, file_size_bytes bigint not null check (file_size_bytes > 0), content_hash text not null,
  title text not null default '', alt_text text not null default '', caption text not null default '', description text not null default '',
  width integer, height integer, variants jsonb not null default '{}'::jsonb, section_key text,
  is_featured boolean not null default false, is_active boolean not null default true, display_order integer not null default 0,
  deleted_at timestamptz, deleted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.products add constraint products_og_image_fk foreign key (og_image_id) references public.media(id) on delete set null;
create table public.product_media (
  product_id uuid not null references public.products(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete restrict,
  role text not null default 'gallery' check (role in ('primary', 'gallery', 'hover', 'spin', 'certificate')),
  display_order integer not null default 0, primary key (product_id, media_id)
);

create table public.pages (
  id uuid primary key default gen_random_uuid(), page_key text not null unique, title text not null,
  status public.content_status not null default 'draft', seo_title text not null default '', seo_description text not null default '',
  updated_at timestamptz not null default now(), updated_by uuid references public.profiles(id) on delete set null
);
create table public.page_modules (
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.pages(id) on delete cascade,
  module_type text not null, configuration jsonb not null default '{}'::jsonb, display_order integer not null default 0,
  is_active boolean not null default true, visible_on text not null default 'both' check (visible_on in ('desktop', 'mobile', 'both')),
  starts_at timestamptz, ends_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null, check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.metal_rates (
  id uuid primary key default gen_random_uuid(), metal text not null, purity text not null,
  rate_per_gram numeric(14,4) not null check (rate_per_gram > 0), effective_at timestamptz not null default now(),
  manual_override boolean not null default true, updated_by uuid not null references public.profiles(id) on delete restrict,
  unique (metal, purity)
);
create table public.metal_rate_history (
  id uuid primary key default gen_random_uuid(), metal text not null, purity text not null,
  previous_rate numeric(14,4), new_rate numeric(14,4) not null, effective_at timestamptz not null,
  changed_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now()
);
create table public.enquiries (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text not null default '',
  message text not null, product_id uuid references public.products(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid, previous_value jsonb, new_value jsonb,
  ip_address inet, user_agent text, created_at timestamptz not null default now()
);

create index products_catalogue_idx on public.products (status, deleted_at, display_order);
create index products_category_idx on public.products (category_id, status, deleted_at);
create index media_section_idx on public.media (section_key, is_active, deleted_at);
create index modules_page_idx on public.page_modules (page_id, is_active, display_order);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace function public.is_admin_or_editor() returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('super_admin', 'admin', 'editor')); $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('super_admin', 'admin')); $$;

alter table public.profiles enable row level security; alter table public.taxonomy_terms enable row level security;
alter table public.products enable row level security; alter table public.media enable row level security;
alter table public.product_media enable row level security; alter table public.pages enable row level security;
alter table public.page_modules enable row level security; alter table public.metal_rates enable row level security;
alter table public.metal_rate_history enable row level security; alter table public.enquiries enable row level security;
alter table public.audit_logs enable row level security;

create policy "users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admins manage catalogue" on public.products for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create policy "admins manage taxonomy" on public.taxonomy_terms for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create policy "admins manage media" on public.media for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create policy "admins manage product media" on public.product_media for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create policy "admins manage pages" on public.pages for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create policy "admins manage modules" on public.page_modules for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create policy "admins manage rates" on public.metal_rates for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read rate history" on public.metal_rate_history for select using (public.is_admin_or_editor());
create policy "admins manage enquiries" on public.enquiries for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create policy "admins read audit logs" on public.audit_logs for select using (public.is_admin());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', '')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
