create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique check (setting_key ~ '^[a-z0-9_-]+$'),
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index site_settings_public_idx on public.site_settings (setting_key) where is_public;
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

create policy "public reads public site settings" on public.site_settings for select to anon, authenticated using (is_public);
create policy "staff manages site settings" on public.site_settings for all to authenticated using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

create trigger site_settings_set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
create trigger site_settings_audit after insert or update or delete on public.site_settings for each row execute function public.record_audit_event();

insert into public.site_settings (setting_key, value, is_public)
values (
  'homepage',
  '{"heroEyebrow":"PS Jewellers · Jhunjhunu","heroTitle":"Luxury jewellery crafted for life''s finest occasions.","heroDescription":"BIS hallmarked gold, certified diamonds and handcrafted 925 silver, from our Jhunjhunu showroom.","primaryCtaLabel":"Shop Collection","primaryCtaHref":"/shop"}'::jsonb,
  true
)
on conflict (setting_key) do nothing;
