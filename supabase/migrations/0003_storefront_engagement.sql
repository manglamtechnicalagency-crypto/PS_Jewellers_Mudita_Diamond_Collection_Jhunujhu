-- 0003_storefront_engagement.sql
--
-- Backs the storefront surfaces that currently render but do nothing:
--   Contact / "Enquire Now"  -> enquiries (public INSERT was missing)
--   "Book Appointment"       -> appointments
--   Newsletter form          -> newsletter_subscribers
--   Product page reviews     -> product_reviews (moderated)
--   Store Locator            -> store_locations
--
-- Every public-writable table follows the same rule: anonymous users may INSERT
-- a constrained row and may never read the table back. Reading submissions is
-- staff-only. Reviews are the single exception — approved rows are public.

-- ---------------------------------------------------------------------------
-- Shared validation
-- ---------------------------------------------------------------------------

create or replace function public.is_valid_email(value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select value ~ '^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$' and length(value) <= 254;
$$;

comment on function public.is_valid_email(text) is
  'Deliberately permissive shape check. Deliverability is proven by sending, not by regex.';

-- ---------------------------------------------------------------------------
-- Enquiries: allow public submission
-- ---------------------------------------------------------------------------

alter table public.enquiries
  add column if not exists source text not null default 'contact_form'
    check (source in ('contact_form', 'product_enquiry', 'whatsapp', 'phone', 'walk_in', 'other')),
  add column if not exists preferred_contact text not null default 'email'
    check (preferred_contact in ('email', 'phone', 'whatsapp')),
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists internal_notes text not null default '',
  add column if not exists resolved_at timestamptz;

alter table public.enquiries
  add constraint enquiries_name_length    check (char_length(btrim(name)) between 1 and 120),
  add constraint enquiries_message_length check (char_length(btrim(message)) between 1 and 4000),
  add constraint enquiries_email_shape    check (public.is_valid_email(email)),
  add constraint enquiries_phone_shape    check (phone = '' or phone ~ '^[0-9+()\-.\s]{6,20}$');

grant insert on public.enquiries to anon, authenticated;

-- Submit-only: no USING clause means no read path is opened.
create policy "public submits enquiries"
  on public.enquiries for insert
  to anon, authenticated
  with check (
    status = 'new'
    and internal_notes = ''
    and assigned_to is null
    and resolved_at is null
    and (product_id is null or exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published' and p.deleted_at is null
    ))
  );

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null check (public.is_valid_email(email)),
  phone text not null check (phone ~ '^[0-9+()\-.\s]{6,20}$'),
  appointment_type text not null default 'general'
    check (appointment_type in ('general', 'bridal_styling', 'custom_design', 'valuation', 'repair')),
  preferred_at timestamptz not null,
  alternate_at timestamptz,
  party_size integer not null default 1 check (party_size between 1 and 20),
  notes text not null default '' check (char_length(notes) <= 2000),
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show')),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_alternate_after_preferred
    check (alternate_at is null or alternate_at <> preferred_at)
);

comment on table public.appointments is 'Showroom visit requests raised from the Book Appointment CTA.';

create index appointments_schedule_idx on public.appointments (status, preferred_at);
create index appointments_created_idx  on public.appointments (created_at desc);

alter table public.appointments enable row level security;
grant insert on public.appointments to anon, authenticated;
grant select, update, delete on public.appointments to authenticated;

create policy "public requests appointments"
  on public.appointments for insert
  to anon, authenticated
  with check (
    status = 'requested'
    and confirmed_at is null
    and confirmed_by is null
    and internal_notes = ''
    -- Reject obvious garbage: no past dates, nothing beyond a year out.
    and preferred_at > now()
    and preferred_at < now() + interval '1 year'
  );

create policy "staff manage appointments"
  on public.appointments for all
  to authenticated
  using (public.is_admin_or_editor())
  with check (public.is_admin_or_editor());

create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger appointments_audit after insert or update or delete on public.appointments for each row execute function public.record_audit_event();

-- ---------------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------------

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (public.is_valid_email(email)),
  -- Case-insensitive uniqueness without a functional index on a mutable column.
  email_normalised text generated always as (lower(btrim(email))) stored,
  status text not null default 'pending'
    check (status in ('pending', 'subscribed', 'unsubscribed', 'bounced')),
  source text not null default 'footer_form'
    check (source in ('footer_form', 'checkout', 'appointment', 'import', 'other')),
  -- Double opt-in token. Never exposed by any public policy.
  confirmation_token uuid not null default gen_random_uuid(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index newsletter_email_unique_idx on public.newsletter_subscribers (email_normalised);
create index newsletter_status_idx on public.newsletter_subscribers (status, created_at desc);

comment on table public.newsletter_subscribers is
  'Double opt-in list. A row starts as pending; confirmation is a server-side action, never a client update.';

alter table public.newsletter_subscribers enable row level security;
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;

create policy "public subscribes to newsletter"
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and confirmed_at is null
    and unsubscribed_at is null
  );

create policy "staff manage newsletter"
  on public.newsletter_subscribers for all
  to authenticated
  using (public.is_admin_or_editor())
  with check (public.is_admin_or_editor());

create trigger newsletter_set_updated_at before update on public.newsletter_subscribers for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Product reviews (moderated)
-- ---------------------------------------------------------------------------

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 80),
  author_email text not null check (public.is_valid_email(author_email)),
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 140),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'spam')),
  is_verified_purchase boolean not null default false,
  moderated_at timestamptz,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderation_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_reviews is
  'Reviews are pending until a staff member approves them. Only approved rows are publicly readable; author_email is withheld from anon by a column-level grant.';

create index product_reviews_public_idx on public.product_reviews (product_id, created_at desc) where status = 'approved';
create index product_reviews_queue_idx  on public.product_reviews (status, created_at) where status = 'pending';

alter table public.product_reviews enable row level security;
grant insert on public.product_reviews to anon, authenticated;
-- Column-level grant: author_email is deliberately excluded, so an anonymous
-- caller cannot read reviewer addresses even on approved rows.
grant select (id, product_id, author_name, rating, title, body, is_verified_purchase, created_at)
  on public.product_reviews to anon, authenticated;
grant select on public.product_reviews to authenticated;
grant update, delete on public.product_reviews to authenticated;

create policy "public submits reviews"
  on public.product_reviews for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and moderated_at is null
    and moderated_by is null
    and moderation_note = ''
    and is_verified_purchase = false
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published' and p.deleted_at is null
    )
  );

create policy "public reads approved reviews"
  on public.product_reviews for select
  to anon, authenticated
  using (status = 'approved');

create policy "staff moderate reviews"
  on public.product_reviews for all
  to authenticated
  using (public.is_admin_or_editor())
  with check (public.is_admin_or_editor());

create trigger product_reviews_set_updated_at before update on public.product_reviews for each row execute function public.set_updated_at();
create trigger product_reviews_audit after insert or update or delete on public.product_reviews for each row execute function public.record_audit_event();

-- Convenience read path for the storefront. The column grant above is what
-- actually protects author_email; this view just saves every caller repeating
-- the column list and the status filter.
create view public.product_reviews_public
with (security_invoker = true) as
  select id, product_id, author_name, rating, title, body, is_verified_purchase, created_at
  from public.product_reviews
  where status = 'approved';

grant select on public.product_reviews_public to anon, authenticated;

-- Denormalised rating rollup so product cards do not aggregate on every render.
alter table public.products
  add column if not exists rating_average numeric(3,2) not null default 0
    check (rating_average >= 0 and rating_average <= 5),
  add column if not exists rating_count integer not null default 0
    check (rating_count >= 0);

create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set rating_average = coalesce(agg.avg_rating, 0),
         rating_count   = coalesce(agg.total, 0)
    from (
      select avg(rating)::numeric(3,2) as avg_rating, count(*) as total
      from public.product_reviews
      where product_id = v_product_id and status = 'approved'
    ) agg
   where p.id = v_product_id;

  return null;
end;
$$;

create trigger product_reviews_refresh_rating
  after insert or update or delete on public.product_reviews
  for each row execute function public.refresh_product_rating();

-- ---------------------------------------------------------------------------
-- Store locations
-- ---------------------------------------------------------------------------

create table public.store_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address_line1 text not null,
  address_line2 text not null default '',
  city text not null,
  state text not null default 'Rajasthan',
  postal_code text not null default '',
  country_code text not null default 'IN' check (char_length(country_code) = 2),
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
  maps_url text not null default '',
  -- [{"day":"mon","opens":"10:30","closes":"20:00"}, ...]
  opening_hours jsonb not null default '[]'::jsonb,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.store_locations is 'Showroom directory behind the Store Locator page.';

-- At most one primary showroom.
create unique index store_locations_single_primary_idx on public.store_locations (is_primary) where is_primary;
create index store_locations_active_idx on public.store_locations (is_active, display_order);

alter table public.store_locations enable row level security;
grant select on public.store_locations to anon, authenticated;
grant insert, update, delete on public.store_locations to authenticated;

create policy "public reads active stores"
  on public.store_locations for select
  to anon, authenticated
  using (is_active);

create policy "admins manage stores"
  on public.store_locations for all
  to authenticated
  using (public.is_admin_or_editor())
  with check (public.is_admin_or_editor());

create trigger store_locations_set_updated_at before update on public.store_locations for each row execute function public.set_updated_at();
create trigger store_locations_audit after insert or update or delete on public.store_locations for each row execute function public.record_audit_event();
