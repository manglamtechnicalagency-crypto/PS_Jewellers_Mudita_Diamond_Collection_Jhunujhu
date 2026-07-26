alter table public.enquiries
  add column if not exists enquiry_number text,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists selected_options jsonb not null default '{}'::jsonb,
  add column if not exists idempotency_key text,
  add column if not exists consent_at timestamptz,
  add column if not exists page_url text not null default '',
  add column if not exists referrer text not null default '',
  add column if not exists utm_source text not null default '',
  add column if not exists utm_medium text not null default '',
  add column if not exists utm_campaign text not null default '',
  add column if not exists lost_reason text;

drop index if exists enquiries_idempotency_key_idx;
create unique index enquiries_number_unique_idx on public.enquiries (enquiry_number) where enquiry_number is not null;
create unique index enquiries_idempotency_key_idx on public.enquiries (idempotency_key) where idempotency_key is not null;

alter table public.enquiries drop constraint if exists enquiries_status_check;
alter table public.enquiries add constraint enquiries_status_check check (status in ('new', 'contacted', 'qualified', 'proposal', 'showroom_visit_booked', 'follow_up_required', 'negotiation', 'won', 'lost', 'in_progress', 'resolved', 'spam'));
