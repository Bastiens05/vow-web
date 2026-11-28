-- Replayable. Not applied yet.
-- Adds the missing Mariages.net trades. Existing category values are left as they are,
-- so a current account keeps its métier. Music vendors can record DJ, group, orchestra or choir.

alter type public.vendor_category add value if not exists 'cake';
alter type public.vendor_category add value if not exists 'wine';
alter type public.vendor_category add value if not exists 'animation';
alter type public.vendor_category add value if not exists 'decor';
alter type public.vendor_category add value if not exists 'hair';
alter type public.vendor_category add value if not exists 'makeup';
alter type public.vendor_category add value if not exists 'attire';
alter type public.vendor_category add value if not exists 'stationery';
alter type public.vendor_category add value if not exists 'transport';

alter table public.vendor_profiles
  add column if not exists music_kind text;

alter table public.vendor_profiles
  drop constraint if exists vendor_profiles_music_kind;

alter table public.vendor_profiles
  add constraint vendor_profiles_music_kind
  check (music_kind is null or music_kind in ('dj', 'band', 'orchestra', 'choir'));

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
