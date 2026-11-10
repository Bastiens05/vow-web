-- Separate couple day-of actions from vendor tools, and hide practical
-- sheets from trades that do not use them.
-- Apply after 20261110210000_practical.sql.

alter type public.vendor_category add value if not exists 'videographer';
alter type public.vendor_category add value if not exists 'officiant';

-- sheet: practical | photos | guests
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
  if uid is null or sheet not in ('practical', 'photos', 'guests') then
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
  return false;
end;
$$;

revoke all on function public.can_see_sheet(uuid, text) from public, anon;
grant execute on function public.can_see_sheet(uuid, text) to authenticated;

drop policy if exists photo_groups_select on public.photo_groups;
drop policy if exists photo_groups_insert on public.photo_groups;
drop policy if exists photo_groups_update on public.photo_groups;
drop policy if exists photo_groups_delete on public.photo_groups;
drop policy if exists guests_select on public.guests;
drop policy if exists guests_insert on public.guests;
drop policy if exists guests_update on public.guests;
drop policy if exists guests_delete on public.guests;

create policy photo_groups_select on public.photo_groups
  for select to authenticated
  using (public.can_see_sheet(wedding_id, 'photos'));

create policy photo_groups_insert on public.photo_groups
  for insert to authenticated
  with check (public.can_see_sheet(wedding_id, 'photos'));

create policy photo_groups_update on public.photo_groups
  for update to authenticated
  using (public.can_see_sheet(wedding_id, 'photos'))
  with check (public.can_see_sheet(wedding_id, 'photos'));

create policy photo_groups_delete on public.photo_groups
  for delete to authenticated
  using (public.can_see_sheet(wedding_id, 'photos'));

create policy guests_select on public.guests
  for select to authenticated
  using (public.can_see_sheet(wedding_id, 'guests'));

create policy guests_insert on public.guests
  for insert to authenticated
  with check (public.can_see_sheet(wedding_id, 'guests'));

create policy guests_update on public.guests
  for update to authenticated
  using (public.can_see_sheet(wedding_id, 'guests'))
  with check (public.can_see_sheet(wedding_id, 'guests'));

create policy guests_delete on public.guests
  for delete to authenticated
  using (public.can_see_sheet(wedding_id, 'guests'));

create or replace function public.shift_timeline_slot(
  p_slot_id uuid,
  p_new_time time,
  p_cascade boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  slot public.timeline_slots%rowtype;
  author text;
  minutes integer;
  body text;
  note_id uuid;
  clock text;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  select * into slot from public.timeline_slots where id = p_slot_id;
  if not found then
    raise exception 'Moment introuvable';
  end if;
  if not public.is_wedding_couple(slot.wedding_id) then
    raise exception 'Seul le couple peut décaler le déroulé';
  end if;
  if p_new_time is null then
    raise exception 'Indiquez une heure';
  end if;

  minutes := round(extract(epoch from (p_new_time - slot.starts_at)) / 60.0)::integer;
  if minutes = 0 then
    raise exception 'Cet horaire est déjà celui du moment';
  end if;

  if p_cascade then
    update public.timeline_slots
    set starts_at = starts_at + (p_new_time - slot.starts_at)
    where wedding_id = slot.wedding_id
      and id <> slot.id
      and (
        starts_at > slot.starts_at
        or (starts_at = slot.starts_at and sort_order > slot.sort_order)
      );
  end if;

  update public.timeline_slots
  set starts_at = p_new_time
  where id = slot.id;

  select coalesce(nullif(btrim(full_name), ''), 'Quelqu''un')
    into author
  from public.profiles
  where id = uid;

  clock := to_char(p_new_time, 'HH24') || 'h' || to_char(p_new_time, 'MI');
  body := author || ' a ' || case when minutes > 0 then 'décalé' else 'avancé' end
    || ' ' || slot.title || ' de ' || abs(minutes) || ' '
    || case when abs(minutes) = 1 then 'minute' else 'minutes' end
    || ', c''est désormais à ' || clock || '.';

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (slot.wedding_id, uid, 'shift', body)
  returning id into note_id;

  return jsonb_build_object(
    'notification_id', note_id,
    'wedding_id', slot.wedding_id,
    'body', body,
    'minutes', minutes
  );
end;
$$;

create or replace function public.post_wedding_alert(
  p_wedding_id uuid,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  author text;
  clean text;
  body text;
  note_id uuid;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  if not public.is_wedding_couple(p_wedding_id) then
    raise exception 'Seul le couple peut envoyer une alerte du jour J';
  end if;

  clean := btrim(coalesce(p_message, ''));
  if char_length(clean) < 2 or char_length(clean) > 240 then
    raise exception 'Écrivez un message court (2 à 240 caractères)';
  end if;

  select coalesce(nullif(btrim(full_name), ''), 'Quelqu''un')
    into author
  from public.profiles
  where id = uid;

  body := author || ' : ' || clean;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (p_wedding_id, uid, 'alert', body)
  returning id into note_id;

  return jsonb_build_object(
    'notification_id', note_id,
    'wedding_id', p_wedding_id,
    'body', body
  );
end;
$$;
