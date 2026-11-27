-- Replayable. The couple reads shared vault files without a published profile.
-- The photographer notifies the couple, and the couple can refuse or move the session.
-- The photographer composes a group only from guest names already on the wedding.

create or replace function public.shared_vault_files(p_wedding uuid, p_vendor_user uuid)
returns table (
  id uuid,
  title text,
  file_name text,
  category text,
  storage_path text,
  expires_on date,
  alert_days integer
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.title, f.file_name, f.category, f.storage_path, f.expires_on, f.alert_days
  from public.vendor_vault_files f
  join public.vendor_profiles v on v.id = f.vendor_id
  join public.vendor_vault_shares s on s.file_id = f.id
  where s.wedding_id = p_wedding
    and v.user_id = p_vendor_user
    and public.is_wedding_member(p_wedding)
    and (
      v.user_id = auth.uid()
      or s.recipient_user_id = auth.uid()
      or (s.recipient_user_id is null and public.is_wedding_couple(p_wedding))
    );
$$;

revoke all on function public.shared_vault_files(uuid, uuid) from public, anon;
grant execute on function public.shared_vault_files(uuid, uuid) to authenticated;

create or replace function public.notify_couple_session(p_wedding uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if p_body is null or char_length(btrim(p_body)) < 1 or char_length(p_body) > 500 then
    raise exception 'Message invalide';
  end if;
  if not exists (
    select 1
    from public.wedding_members m
    join public.vendor_profiles v on v.user_id = m.user_id
    where m.wedding_id = p_wedding
      and m.user_id = auth.uid()
      and m.member_role = 'vendor'
      and v.category::text = 'photographer'
  ) then
    raise exception 'Réservé au photographe de ce mariage';
  end if;
  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (p_wedding, auth.uid(), 'reminder', btrim(p_body));
end;
$$;

revoke all on function public.notify_couple_session(uuid, text) from public, anon;
grant execute on function public.notify_couple_session(uuid, text) to authenticated;

create or replace function public.respond_couple_session(
  p_suggestion uuid,
  p_choice text,
  p_time text,
  p_place text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  suggestion public.timeline_suggestions%rowtype;
  slot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  select * into suggestion from public.timeline_suggestions where id = p_suggestion;
  if suggestion.id is null or suggestion.label <> 'Séance couple' then
    raise exception 'Cette proposition n''est plus là';
  end if;
  if not public.is_wedding_couple(suggestion.wedding_id) then
    raise exception 'Seul le couple répond à la séance';
  end if;

  if p_choice = 'refuse' then
    delete from public.timeline_suggestions where id = suggestion.id;
    insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
    values (
      suggestion.wedding_id,
      auth.uid(),
      'reminder',
      'Le couple a refusé la séance couple.',
      suggestion.author_id
    );
    return;
  end if;

  if p_choice = 'counter' then
    if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Indiquez une heure, par exemple 19:00';
    end if;
    if p_place is null or char_length(btrim(p_place)) < 2 then
      raise exception 'Indiquez le lieu';
    end if;
    slot := jsonb_build_array(jsonb_build_object(
      'title', 'Séance couple',
      'startsAt', p_time,
      'place', btrim(p_place),
      'notes', ''
    ));
    update public.timeline_suggestions
    set slots = slot
    where id = suggestion.id;
    insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
    values (
      suggestion.wedding_id,
      auth.uid(),
      'reminder',
      'Le couple propose une autre heure pour la séance : ' || p_time || '.',
      suggestion.author_id
    );
    return;
  end if;

  raise exception 'Réponse inconnue';
end;
$$;

revoke all on function public.respond_couple_session(uuid, text, text, text) from public, anon;
grant execute on function public.respond_couple_session(uuid, text, text, text) to authenticated;

create or replace function public.compose_named_photo_group(p_wedding uuid, p_title text, p_names text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created uuid;
  person text;
  listed text := '';
  title text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if not exists (
    select 1
    from public.wedding_members m
    join public.vendor_profiles v on v.user_id = m.user_id
    where m.wedding_id = p_wedding
      and m.user_id = auth.uid()
      and m.member_role = 'vendor'
      and v.category::text = 'photographer'
  ) then
    raise exception 'Réservé au photographe de ce mariage';
  end if;
  if p_names is null or cardinality(p_names) < 1 then
    raise exception 'Choisissez au moins un invité';
  end if;
  foreach person in array p_names loop
    if not exists (
      select 1 from public.guests g
      where g.wedding_id = p_wedding and btrim(g.full_name) = btrim(person)
    ) then
      raise exception 'Ce nom n''est pas dans la liste des invités';
    end if;
    listed := case when listed = '' then btrim(person) else listed || ', ' || btrim(person) end;
  end loop;
  if char_length(listed) > 1000 then
    raise exception 'La liste est trop longue';
  end if;
  title := left(btrim(coalesce(p_title, '')), 120);
  if char_length(title) < 1 then
    title := 'Groupe';
  end if;
  insert into public.photo_groups (wedding_id, title, people, notes, sort_order)
  values (
    p_wedding,
    title,
    listed,
    '',
    coalesce((select max(sort_order) + 1 from public.photo_groups where wedding_id = p_wedding), 0)
  )
  returning id into created;
  return created;
end;
$$;

revoke all on function public.compose_named_photo_group(uuid, text, text[]) from public, anon;
grant execute on function public.compose_named_photo_group(uuid, text, text[]) to authenticated;
