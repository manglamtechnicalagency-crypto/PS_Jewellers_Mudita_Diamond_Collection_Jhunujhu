-- CRM workflow and auditable metal-rate operations.

-- Preserve existing data while moving the queue to a sales lifecycle.
update public.enquiries set status = 'contacted' where status = 'in_progress';
update public.enquiries set status = 'won' where status = 'resolved';
alter table public.enquiries drop constraint if exists enquiries_status_check;
alter table public.enquiries add constraint enquiries_status_check
  check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'spam'));

create index if not exists enquiries_assignment_idx
  on public.enquiries (assigned_to, status, created_at desc);
create index if not exists enquiries_follow_up_idx
  on public.enquiries (next_follow_up_at) where next_follow_up_at is not null;

create or replace function public.guard_enquiry_assignment()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.assigned_to is not null and not exists (
    select 1 from public.profiles
    where id = new.assigned_to and role in ('super_admin', 'admin', 'editor')
  ) then
    raise exception 'assigned user is not active staff' using errcode = 'foreign_key_violation';
  end if;
  if new.status = 'won' and new.resolved_at is null then new.resolved_at = now(); end if;
  if new.status <> 'won' then new.resolved_at = null; end if;
  return new;
end;
$$;
drop trigger if exists enquiries_assignment_guard on public.enquiries;
create trigger enquiries_assignment_guard
  before insert or update on public.enquiries
  for each row execute function public.guard_enquiry_assignment();

-- Rate provenance belongs to both the live row and immutable history.
alter table public.metal_rates
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'market_feed', 'supplier', 'import')),
  add column if not exists reason text not null default 'Initial rate'
    check (char_length(btrim(reason)) between 1 and 500);
alter table public.metal_rate_history
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'market_feed', 'supplier', 'import')),
  add column if not exists reason text not null default 'Rate change'
    check (char_length(btrim(reason)) between 1 and 500);

create table if not exists public.metal_rate_schedules (
  id uuid primary key default gen_random_uuid(),
  metal text not null,
  purity text not null,
  rate_per_gram numeric(14,4) not null check (rate_per_gram > 0),
  effective_at timestamptz not null,
  source text not null default 'manual' check (source in ('manual', 'market_feed', 'supplier', 'import')),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_by uuid not null references public.profiles(id) on delete restrict,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  constraint metal_rate_schedule_future check (effective_at > created_at)
);
create unique index if not exists metal_rate_schedule_pending_unique
  on public.metal_rate_schedules (metal, purity, effective_at) where applied_at is null;
create index if not exists metal_rate_schedule_due_idx
  on public.metal_rate_schedules (effective_at) where applied_at is null;
alter table public.metal_rate_schedules enable row level security;
grant select, insert, update on public.metal_rate_schedules to authenticated;
create policy "admins read rate schedules" on public.metal_rate_schedules for select to authenticated using (public.is_admin_or_editor());
create policy "admins manage rate schedules" on public.metal_rate_schedules for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Existing history trigger now records the submitted provenance. Repricing is
-- performed only for live rows; future values live in the schedule table.
create or replace function public.record_metal_rate_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.rate_per_gram = new.rate_per_gram then return new; end if;
  insert into public.metal_rate_history
    (metal, purity, previous_rate, new_rate, effective_at, changed_by, source, reason)
  values (new.metal, new.purity, case when tg_op = 'UPDATE' then old.rate_per_gram else null end,
          new.rate_per_gram, new.effective_at, new.updated_by, new.source, new.reason);
  return new;
end;
$$;

create or replace function public.on_metal_rate_changed()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.effective_at <= now() then
    perform public.refresh_weight_based_prices(new.metal, new.purity);
  end if;
  return new;
end;
$$;

create or replace function public.apply_due_metal_rate_schedules()
returns integer language plpgsql security definer set search_path = public
as $$
declare item record; applied integer := 0;
begin
  if not public.is_admin() then raise exception 'permission denied' using errcode = 'insufficient_privilege'; end if;
  for item in
    select * from public.metal_rate_schedules
    where applied_at is null and effective_at <= now()
    order by effective_at for update skip locked
  loop
    insert into public.metal_rates (metal, purity, rate_per_gram, effective_at, manual_override, updated_by, source, reason)
    values (item.metal, item.purity, item.rate_per_gram, item.effective_at, item.source = 'manual', auth.uid(), item.source, item.reason)
    on conflict (metal, purity) do update set rate_per_gram = excluded.rate_per_gram,
      effective_at = excluded.effective_at, manual_override = excluded.manual_override,
      updated_by = excluded.updated_by, source = excluded.source, reason = excluded.reason;
    update public.metal_rate_schedules set applied_at = now() where id = item.id;
    applied := applied + 1;
  end loop;
  return applied;
end;
$$;
grant execute on function public.apply_due_metal_rate_schedules() to authenticated;
