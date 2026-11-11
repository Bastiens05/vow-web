alter table public.photo_groups
  add column if not exists called_at timestamptz,
  add column if not exists place text not null default '';
