-- One wedding profile. The couple writes each fact once.
-- Vendors read only the keys of their trade, through a definer function.

create table public.wedding_profile (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  facts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint wedding_profile_object check (jsonb_typeof(facts) = 'object')
);

create table public.profile_field_access (
  field_key text not null,
  category text not null,
  primary key (field_key, category)
);

alter table public.wedding_profile enable row level security;
alter table public.profile_field_access enable row level security;

grant select, insert, update on public.wedding_profile to authenticated;
grant select on public.profile_field_access to authenticated;

create policy wedding_profile_couple on public.wedding_profile
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy profile_field_access_read on public.profile_field_access
  for select to authenticated
  using (true);

insert into public.profile_field_access (field_key, category) values
  ('guest_adults', 'caterer'), ('guest_adults', 'venue'), ('guest_adults', 'planner'), ('guest_adults', 'photographer'), ('guest_adults', 'videographer'), ('guest_adults', 'officiant'), ('guest_adults', 'florist'), ('guest_adults', 'dj'), ('guest_adults', 'beauty'), ('guest_adults', 'other'),
  ('guest_children', 'caterer'), ('guest_children', 'venue'), ('guest_children', 'planner'),
  ('diets', 'caterer'), ('diets', 'planner'),
  ('ceremony_address', 'photographer'), ('ceremony_address', 'videographer'), ('ceremony_address', 'dj'), ('ceremony_address', 'florist'), ('ceremony_address', 'caterer'), ('ceremony_address', 'venue'), ('ceremony_address', 'planner'), ('ceremony_address', 'beauty'), ('ceremony_address', 'officiant'), ('ceremony_address', 'other'),
  ('reception_address', 'photographer'), ('reception_address', 'videographer'), ('reception_address', 'dj'), ('reception_address', 'florist'), ('reception_address', 'caterer'), ('reception_address', 'venue'), ('reception_address', 'planner'), ('reception_address', 'beauty'), ('reception_address', 'officiant'), ('reception_address', 'other'),
  ('prep_address', 'photographer'), ('prep_address', 'videographer'), ('prep_address', 'beauty'), ('prep_address', 'planner'),
  ('ceremony_time', 'photographer'), ('ceremony_time', 'videographer'), ('ceremony_time', 'dj'), ('ceremony_time', 'florist'), ('ceremony_time', 'caterer'), ('ceremony_time', 'venue'), ('ceremony_time', 'planner'), ('ceremony_time', 'beauty'), ('ceremony_time', 'officiant'), ('ceremony_time', 'other'),
  ('dinner_time', 'caterer'), ('dinner_time', 'dj'), ('dinner_time', 'venue'), ('dinner_time', 'planner'), ('dinner_time', 'photographer'), ('dinner_time', 'videographer'),
  ('party_end', 'dj'), ('party_end', 'venue'), ('party_end', 'planner'),
  ('first_dance', 'dj'), ('first_dance', 'photographer'), ('first_dance', 'videographer'), ('first_dance', 'planner'),
  ('music_avoid', 'dj'), ('music_avoid', 'planner'),
  ('color_palette', 'florist'), ('color_palette', 'planner'), ('color_palette', 'beauty'),
  ('bouquet', 'florist'), ('bouquet', 'photographer'), ('bouquet', 'planner'),
  ('key_contacts', 'photographer'), ('key_contacts', 'videographer'), ('key_contacts', 'dj'), ('key_contacts', 'florist'), ('key_contacts', 'caterer'), ('key_contacts', 'venue'), ('key_contacts', 'planner'), ('key_contacts', 'beauty'), ('key_contacts', 'officiant'), ('key_contacts', 'other'),
  ('on_site_contact', 'venue'), ('on_site_contact', 'planner'), ('on_site_contact', 'photographer'), ('on_site_contact', 'caterer'), ('on_site_contact', 'dj'),
  ('access_time', 'venue'), ('access_time', 'photographer'), ('access_time', 'videographer'), ('access_time', 'florist'), ('access_time', 'dj'), ('access_time', 'caterer'), ('access_time', 'planner'),
  ('story', 'officiant'), ('story', 'planner'),
  ('reading', 'officiant'), ('reading', 'planner'),
  ('vows', 'officiant'), ('vows', 'planner'),
  ('drone', 'videographer'), ('drone', 'venue'), ('drone', 'planner'),
  ('speech_film', 'videographer'), ('speech_film', 'planner'),
  ('makeup_time', 'beauty'), ('makeup_time', 'photographer'), ('makeup_time', 'planner'),
  ('trial_done', 'beauty'), ('trial_done', 'planner'),
  ('must_happen', 'planner'),
  ('keep_simple', 'planner'),
  ('emergency', 'planner'), ('emergency', 'venue');

create or replace function public.my_profile_slice(p_wedding uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  facts jsonb := '{}'::jsonb;
  cat text;
begin
  if auth.uid() is null then
    return '{}'::jsonb;
  end if;
  if not public.is_wedding_member(p_wedding) and not public.is_wedding_couple(p_wedding) then
    return '{}'::jsonb;
  end if;
  select coalesce(wp.facts, '{}'::jsonb) into facts
  from public.wedding_profile wp
  where wp.wedding_id = p_wedding;
  facts := coalesce(facts, '{}'::jsonb);
  if public.is_wedding_couple(p_wedding) then
    return facts;
  end if;
  select v.category::text into cat from public.vendor_profiles v where v.user_id = auth.uid();
  if cat is null or cat = 'planner' then
    return facts;
  end if;
  return coalesce((
    select jsonb_object_agg(e.key, e.value)
    from jsonb_each_text(facts) e
    where exists (
      select 1 from public.profile_field_access a
      where a.field_key = e.key and a.category = cat
    )
  ), '{}'::jsonb);
end;
$$;

revoke all on function public.my_profile_slice(uuid) from public, anon;
grant execute on function public.my_profile_slice(uuid) to authenticated;
