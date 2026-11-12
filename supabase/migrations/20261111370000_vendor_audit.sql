-- Music notes stay with the DJ, the planner and the couple.
-- Vendors only read the rain programme while it is the active version.

create table public.wedding_music (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  notes text not null default '',
  constraint wedding_music_notes check (char_length(notes) <= 2000)
);

alter table public.wedding_music enable row level security;
grant select, insert, update, delete on public.wedding_music to authenticated;

create or replace function public.can_see_sheet(wid uuid, sheet text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mrole public.app_role;
  cat text;
begin
  if uid is null or sheet not in ('practical', 'photos', 'guests', 'music') then
    return false;
  end if;

  select member_role into mrole
  from public.wedding_members
  where wedding_id = wid and user_id = uid;

  if mrole is null then
    return false;
  end if;
  if mrole = 'couple' or sheet = 'practical' then
    return true;
  end if;

  select category::text into cat
  from public.vendor_profiles
  where user_id = uid;

  if cat is null then
    return false;
  end if;
  if cat = 'planner' then
    return true;
  end if;
  if sheet = 'photos' then
    return cat in ('photographer', 'videographer');
  end if;
  if sheet = 'guests' then
    return cat in ('caterer', 'venue');
  end if;
  if sheet = 'music' then
    return cat = 'dj';
  end if;
  return false;
end;
$$;

create policy wedding_music_select on public.wedding_music
  for select to authenticated
  using (public.can_see_sheet(wedding_id, 'music'));

create policy wedding_music_couple on public.wedding_music
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

drop policy if exists rain_slots_select on public.rain_slots;
create policy rain_slots_select on public.rain_slots
  for select to authenticated
  using (
    public.is_wedding_couple(wedding_id)
    or (
      public.is_wedding_member(wedding_id)
      and exists (
        select 1 from public.rain_plans p
        where p.wedding_id = rain_slots.wedding_id and p.active
      )
    )
  );

drop policy if exists rain_stops_select on public.rain_stops;
create policy rain_stops_select on public.rain_stops
  for select to authenticated
  using (
    public.is_wedding_couple(wedding_id)
    or (
      public.is_wedding_member(wedding_id)
      and exists (
        select 1 from public.rain_plans p
        where p.wedding_id = rain_stops.wedding_id and p.active
      )
    )
  );
