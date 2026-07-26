-- 0002_public_read_and_data_integrity.sql
--
-- Closes three gaps left by 0001:
--
--   1. RLS was enabled on every catalogue table but only admin policies existed,
--      so an anonymous storefront visitor could read nothing at all. The site
--      still serves from `src/data.ts`; the moment it reads Supabase it would
--      return zero rows. This adds published-only public read policies.
--   2. `updated_at` columns defaulted to now() but nothing maintained them on
--      UPDATE, so they recorded row creation time forever.
--   3. `audit_logs` and `metal_rate_history` existed but nothing ever wrote to
--      them, and audit rows were mutable by anyone who could reach the table.

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Maintains updated_at on UPDATE. Attach with a BEFORE UPDATE FOR EACH ROW trigger.';

create trigger profiles_set_updated_at        before update on public.profiles        for each row execute function public.set_updated_at();
create trigger taxonomy_terms_set_updated_at  before update on public.taxonomy_terms  for each row execute function public.set_updated_at();
create trigger products_set_updated_at        before update on public.products        for each row execute function public.set_updated_at();
create trigger media_set_updated_at           before update on public.media           for each row execute function public.set_updated_at();
create trigger page_modules_set_updated_at    before update on public.page_modules    for each row execute function public.set_updated_at();
create trigger pages_set_updated_at           before update on public.pages           for each row execute function public.set_updated_at();
create trigger enquiries_set_updated_at       before update on public.enquiries       for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit logging
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so the trigger can write audit rows even though the audit
-- table grants no INSERT to any application role.
create or replace function public.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id uuid;
  v_previous jsonb;
  v_new jsonb;
begin
  if tg_op = 'DELETE' then
    v_entity_id := old.id;
    v_previous  := to_jsonb(old);
    v_new       := null;
  elsif tg_op = 'UPDATE' then
    v_entity_id := new.id;
    v_previous  := to_jsonb(old);
    v_new       := to_jsonb(new);
    -- Skip no-op updates so the log stays signal.
    if v_previous = v_new then
      return new;
    end if;
  else
    v_entity_id := new.id;
    v_previous  := null;
    v_new       := to_jsonb(new);
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, previous_value, new_value)
  values (auth.uid(), lower(tg_op), tg_table_name, v_entity_id, v_previous, v_new);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.record_audit_event() is
  'Generic audit trigger. Records actor, operation, and full row diff into audit_logs.';

create trigger products_audit       after insert or update or delete on public.products       for each row execute function public.record_audit_event();
create trigger media_audit          after insert or update or delete on public.media          for each row execute function public.record_audit_event();
create trigger taxonomy_terms_audit after insert or update or delete on public.taxonomy_terms for each row execute function public.record_audit_event();
create trigger pages_audit          after insert or update or delete on public.pages          for each row execute function public.record_audit_event();
create trigger page_modules_audit   after insert or update or delete on public.page_modules   for each row execute function public.record_audit_event();
create trigger metal_rates_audit    after insert or update or delete on public.metal_rates    for each row execute function public.record_audit_event();
create trigger profiles_audit       after insert or update or delete on public.profiles       for each row execute function public.record_audit_event();

-- Audit rows are append-only. Enforced in the database rather than relying on
-- every future call site to behave.
create or replace function public.reject_audit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_logs is append-only (attempted %)', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.reject_audit_mutation();

-- ---------------------------------------------------------------------------
-- Metal rate history
-- ---------------------------------------------------------------------------

create or replace function public.record_metal_rate_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.rate_per_gram = new.rate_per_gram then
    return new;
  end if;

  insert into public.metal_rate_history (metal, purity, previous_rate, new_rate, effective_at, changed_by)
  values (
    new.metal,
    new.purity,
    case when tg_op = 'UPDATE' then old.rate_per_gram else null end,
    new.rate_per_gram,
    new.effective_at,
    new.updated_by
  );
  return new;
end;
$$;

create trigger metal_rates_history
  after insert or update on public.metal_rates
  for each row execute function public.record_metal_rate_change();

-- ---------------------------------------------------------------------------
-- Public read access (storefront)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.products       to anon, authenticated;
grant select on public.product_media  to anon, authenticated;
grant select on public.media          to anon, authenticated;
grant select on public.taxonomy_terms to anon, authenticated;
grant select on public.pages          to anon, authenticated;
grant select on public.page_modules   to anon, authenticated;
grant select on public.metal_rates    to anon, authenticated;

-- Published, non-deleted products only. Draft and archived rows stay invisible
-- to the storefront even though the same table backs the admin panel.
create policy "public reads published products"
  on public.products for select
  to anon, authenticated
  using (status = 'published' and deleted_at is null);

create policy "public reads active taxonomy"
  on public.taxonomy_terms for select
  to anon, authenticated
  using (is_active);

create policy "public reads active media"
  on public.media for select
  to anon, authenticated
  using (is_active and deleted_at is null);

-- Join rows are only useful alongside a visible product; the product policy
-- above still filters what can actually be reached.
create policy "public reads product media links"
  on public.product_media for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_media.product_id
        and p.status = 'published'
        and p.deleted_at is null
    )
  );

create policy "public reads published pages"
  on public.pages for select
  to anon, authenticated
  using (status = 'published');

create policy "public reads scheduled modules"
  on public.page_modules for select
  to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and exists (
      select 1 from public.pages pg
      where pg.id = page_modules.page_id
        and pg.status = 'published'
    )
  );

-- Rates drive weight-based pricing shown on the storefront.
create policy "public reads metal rates"
  on public.metal_rates for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Profile self-service and role administration
-- ---------------------------------------------------------------------------

-- 0001 shipped a SELECT policy only, so nobody could update a display name and
-- no super_admin could assign a role.
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "admins manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Role escalation guard: only a super_admin may change the role column, and no
-- one may change their own. Without this, "admins manage profiles" would let an
-- admin promote themselves to super_admin.
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role public.admin_role;
begin
  if new.role is distinct from old.role then
    select role into v_actor_role from public.profiles where id = auth.uid();

    if v_actor_role is distinct from 'super_admin' then
      raise exception 'only a super_admin may change roles'
        using errcode = 'insufficient_privilege';
    end if;

    if new.id = auth.uid() then
      raise exception 'a super_admin may not change their own role'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- ---------------------------------------------------------------------------
-- Missing write policies for history and audit reads
-- ---------------------------------------------------------------------------

create policy "admins insert rate history"
  on public.metal_rate_history for insert
  to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Indexes for the access paths the storefront and admin actually use
-- ---------------------------------------------------------------------------

create index products_published_idx
  on public.products (display_order, updated_at desc)
  where status = 'published' and deleted_at is null;

create index products_featured_idx    on public.products (is_featured)     where is_featured     and status = 'published' and deleted_at is null;
create index products_new_arrival_idx on public.products (is_new_arrival)  where is_new_arrival  and status = 'published' and deleted_at is null;
create index products_best_seller_idx on public.products (is_best_seller)  where is_best_seller  and status = 'published' and deleted_at is null;

create index products_collection_idx  on public.products (collection_id)   where deleted_at is null;
create index products_subcategory_idx on public.products (subcategory_id)  where deleted_at is null;
create index products_tags_idx        on public.products using gin (tags);

create index product_media_order_idx  on public.product_media (product_id, display_order);
create index product_media_media_idx  on public.product_media (media_id);

create index taxonomy_parent_idx      on public.taxonomy_terms (parent_id, display_order) where is_active;
create index enquiries_triage_idx     on public.enquiries (status, created_at desc);
create index enquiries_product_idx    on public.enquiries (product_id) where product_id is not null;
create index audit_logs_entity_idx    on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx     on public.audit_logs (actor_id, created_at desc);
create index metal_rate_history_idx   on public.metal_rate_history (metal, purity, effective_at desc);
