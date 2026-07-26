alter table public.media
  add column if not exists previous_storage_key text;

create index if not exists media_previous_storage_key_idx
  on public.media (previous_storage_key)
  where previous_storage_key is not null;
