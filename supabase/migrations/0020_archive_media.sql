-- Delete media from the live catalogue in one transaction.
-- Product links must be removed before the media row because the foreign key
-- intentionally uses ON DELETE RESTRICT.
create or replace function public.archive_media(p_media_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storage_key text;
begin
  if not public.is_admin() then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  select storage_key into v_storage_key
  from public.media
  where id = p_media_id and deleted_at is null
  for update;

  if not found then
    raise exception 'media not found' using errcode = 'P0002';
  end if;

  delete from public.product_media where media_id = p_media_id;

  update public.media
  set deleted_at = now(), deleted_by = auth.uid(), is_active = false
  where id = p_media_id;

  return v_storage_key;
end;
$$;

revoke all on function public.archive_media(uuid) from public;
grant execute on function public.archive_media(uuid) to authenticated;
