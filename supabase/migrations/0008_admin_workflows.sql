create table public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  previous_display_price numeric(14,2),
  new_display_price numeric(14,2),
  previous_price_on_request boolean not null default false,
  new_price_on_request boolean not null default false,
  previous_price_mode public.price_mode,
  new_price_mode public.price_mode,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index product_price_history_product_idx on public.product_price_history (product_id, created_at desc);
alter table public.product_price_history enable row level security;
grant select on public.product_price_history to authenticated;
create policy "staff reads product price history" on public.product_price_history for select to authenticated using (public.is_admin_or_editor());

create or replace function public.record_product_price_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.display_price is distinct from new.display_price
     or old.price_on_request is distinct from new.price_on_request
     or old.price_mode is distinct from new.price_mode then
    insert into public.product_price_history (product_id, previous_display_price, new_display_price, previous_price_on_request, new_price_on_request, previous_price_mode, new_price_mode, changed_by)
    values (new.id, old.display_price, new.display_price, old.price_on_request, new.price_on_request, old.price_mode, new.price_mode, auth.uid());
  end if;
  return new;
end;
$$;

create trigger products_price_history after update on public.products for each row execute function public.record_product_price_change();

create or replace function public.replace_product_media_links(p_product_id uuid, p_links jsonb)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin_or_editor() then raise exception 'permission denied' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.products where id = p_product_id and deleted_at is null) then raise exception 'product not found' using errcode = 'no_data_found'; end if;
  if jsonb_typeof(p_links) <> 'array' then raise exception 'media links must be an array' using errcode = 'invalid_parameter_value'; end if;
  delete from public.product_media where product_id = p_product_id;
  insert into public.product_media (product_id, media_id, role, display_order)
  select p_product_id, item.media_id, item.role, item.display_order
  from jsonb_to_recordset(p_links) as item(media_id uuid, role text, display_order integer)
  join public.media m on m.id = item.media_id and m.deleted_at is null
  where item.role in ('primary', 'gallery', 'hover', 'spin', 'certificate')
    and item.display_order >= 0;
end;
$$;

grant execute on function public.replace_product_media_links(uuid, jsonb) to authenticated;
