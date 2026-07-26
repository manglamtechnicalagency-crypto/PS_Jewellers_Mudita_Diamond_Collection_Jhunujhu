-- Operational controls for inventory, CRM, variants, publishing, and recovery.

alter table public.products
  add column if not exists reserved_quantity integer not null default 0 check (reserved_quantity >= 0 and reserved_quantity <= stock_quantity),
  add column if not exists low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  add column if not exists sold_at timestamptz,
  add column if not exists workflow_status text not null default 'draft' check (workflow_status in ('draft', 'review', 'scheduled', 'published', 'archived')),
  add column if not exists publish_at timestamptz;

alter table public.enquiries
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz;

create table if not exists public.enquiry_activities (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null check (activity_type in ('note', 'email', 'whatsapp', 'phone', 'status_change', 'follow_up')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists enquiry_activities_idx on public.enquiry_activities (enquiry_id, created_at desc);
alter table public.enquiry_activities enable row level security;
grant select, insert on public.enquiry_activities to authenticated;
create policy "staff manages enquiry activities" on public.enquiry_activities for all to authenticated using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null check (public.is_valid_email(email)),
  phone text not null default '',
  measurements jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);
alter table public.enquiries add column if not exists customer_id uuid references public.customer_profiles(id) on delete set null;
alter table public.customer_profiles enable row level security;
grant select, insert, update on public.customer_profiles to authenticated;
create policy "staff manages customer profiles" on public.customer_profiles for all to authenticated using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
create trigger customer_profiles_set_updated_at before update on public.customer_profiles for each row execute function public.set_updated_at();

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  options jsonb not null default '{}'::jsonb,
  price_adjustment numeric(14,2) not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0 and reserved_quantity <= stock_quantity),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants (product_id, is_active);
alter table public.product_variants enable row level security;
create policy "public reads active product variants" on public.product_variants for select to anon, authenticated using (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.deleted_at is null));
create policy "staff manages product variants" on public.product_variants for all to authenticated using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, version_number)
);
create index if not exists product_versions_idx on public.product_versions (product_id, version_number desc);
alter table public.product_versions enable row level security;
grant select on public.product_versions to authenticated;
create policy "staff reads product versions" on public.product_versions for select to authenticated using (public.is_admin_or_editor());

create or replace function public.snapshot_product_version()
returns trigger language plpgsql security definer set search_path = public
as $$
declare next_version integer;
begin
  select coalesce(max(version_number), 0) + 1 into next_version from public.product_versions where product_id = old.id;
  insert into public.product_versions (product_id, version_number, snapshot, created_by)
  values (old.id, next_version, to_jsonb(old), auth.uid());
  return new;
end;
$$;
drop trigger if exists products_version_snapshot on public.products;
create trigger products_version_snapshot before update on public.products for each row when (old is distinct from new) execute function public.snapshot_product_version();

create index if not exists products_inventory_idx on public.products (stock_status, stock_quantity, reserved_quantity, low_stock_threshold) where deleted_at is null;
