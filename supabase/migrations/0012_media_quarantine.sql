alter table public.media
  add column if not exists review_status text not null default 'approved'
    check (review_status in ('pending', 'approved', 'rejected'));

create index if not exists media_review_status_idx on public.media (review_status, is_active, deleted_at);

create or replace function public.register_media(
  p_storage_key text,
  p_original_filename text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_title text default '',
  p_alt_text text default '',
  p_caption text default '',
  p_section_key text default null,
  p_product_id uuid default null,
  p_role text default 'gallery',
  p_display_order integer default 0
)
returns public.media language plpgsql set search_path = public
as $$
declare v_media public.media;
begin
  insert into public.media (storage_key, original_filename, mime_type, file_size_bytes, content_hash, title, alt_text, caption, section_key, created_by, review_status)
  values (p_storage_key, p_original_filename, p_mime_type, p_file_size_bytes, 'r2-managed', coalesce(p_title, ''), coalesce(p_alt_text, ''), coalesce(p_caption, ''), p_section_key, auth.uid(), 'pending')
  returning * into v_media;
  if p_product_id is not null then
    insert into public.product_media (product_id, media_id, role, display_order)
    values (p_product_id, v_media.id, coalesce(p_role, 'gallery'), coalesce(p_display_order, 0));
  end if;
  return v_media;
end;
$$;

grant execute on function public.register_media(text, text, text, bigint, text, text, text, text, uuid, text, integer) to authenticated;
