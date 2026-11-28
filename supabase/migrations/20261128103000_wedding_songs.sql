-- Replayable. Not applied yet.
-- Songs the couple picks for the day. The DJ can read them. Other trades cannot.

create table if not exists public.wedding_songs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  moment text not null,
  title text not null,
  artist text not null,
  album text not null default '',
  artwork_url text not null default '',
  preview_url text not null default '',
  apple_url text not null default '',
  itunes_id text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint wedding_songs_moment check (
    moment in ('entrance', 'ceremony', 'cocktail', 'dinner', 'first_dance', 'party', 'exit', 'other')
  ),
  constraint wedding_songs_title check (char_length(title) between 1 and 200),
  constraint wedding_songs_artist check (char_length(artist) between 1 and 200),
  constraint wedding_songs_album check (char_length(album) <= 200),
  constraint wedding_songs_artwork check (char_length(artwork_url) <= 500),
  constraint wedding_songs_preview check (char_length(preview_url) <= 500),
  constraint wedding_songs_apple check (char_length(apple_url) <= 500),
  constraint wedding_songs_itunes check (char_length(itunes_id) <= 40),
  constraint wedding_songs_order check (sort_order between 0 and 200)
);

create index if not exists wedding_songs_wedding_idx
  on public.wedding_songs (wedding_id, moment, sort_order);

alter table public.wedding_songs enable row level security;
grant select, insert, delete on public.wedding_songs to authenticated;

create or replace function public.can_read_wedding_songs(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_wedding_couple(wid)
    or (
      public.is_wedding_member(wid)
      and exists (
        select 1 from public.vendor_profiles
        where user_id = auth.uid() and category = 'dj'
      )
    );
$$;

revoke all on function public.can_read_wedding_songs(uuid) from public, anon;
grant execute on function public.can_read_wedding_songs(uuid) to authenticated;

drop policy if exists wedding_songs_select on public.wedding_songs;
create policy wedding_songs_select on public.wedding_songs
  for select to authenticated
  using (public.can_read_wedding_songs(wedding_id));

drop policy if exists wedding_songs_insert on public.wedding_songs;
create policy wedding_songs_insert on public.wedding_songs
  for insert to authenticated
  with check (public.is_wedding_couple(wedding_id));

drop policy if exists wedding_songs_delete on public.wedding_songs;
create policy wedding_songs_delete on public.wedding_songs
  for delete to authenticated
  using (public.is_wedding_couple(wedding_id));
