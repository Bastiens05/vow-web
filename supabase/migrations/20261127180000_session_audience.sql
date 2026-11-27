-- The session proposal reaches the couple only.
-- After the couple offers another time, the photographer accepts or refuses it.
-- create or replace only. Safe to run again. Not applied.

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
  insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
  select p_wedding, auth.uid(), 'reminder', btrim(p_body), m.user_id
  from public.wedding_members m
  where m.wedding_id = p_wedding
    and m.member_role = 'couple';
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
      'notes', 'couple'
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

create or replace function public.answer_couple_counter(p_suggestion uuid, p_choice text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  suggestion public.timeline_suggestions%rowtype;
  slot jsonb;
  body text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  select * into suggestion from public.timeline_suggestions where id = p_suggestion;
  if suggestion.id is null or suggestion.label <> 'Séance couple' then
    raise exception 'Cette proposition n''est plus là';
  end if;
  if not exists (
    select 1
    from public.wedding_members m
    join public.vendor_profiles v on v.user_id = m.user_id
    where m.wedding_id = suggestion.wedding_id
      and m.user_id = auth.uid()
      and m.member_role = 'vendor'
      and v.category::text = 'photographer'
  ) then
    raise exception 'Réservé au photographe de ce mariage';
  end if;
  slot := suggestion.slots -> 0;
  if coalesce(slot ->> 'notes', '') <> 'couple' then
    raise exception 'Cette heure n''attend pas votre réponse';
  end if;

  if p_choice = 'accept' then
    insert into public.timeline_slots (wedding_id, title, starts_at, place, notes, created_by)
    values (
      suggestion.wedding_id,
      'Séance couple',
      (slot ->> 'startsAt')::time,
      coalesce(slot ->> 'place', ''),
      '',
      auth.uid()
    );
    delete from public.timeline_suggestions where id = suggestion.id;
    body := 'Le photographe a accepté la séance couple.';
  elsif p_choice = 'refuse' then
    delete from public.timeline_suggestions where id = suggestion.id;
    body := 'Le photographe a refusé l''autre heure.';
  else
    raise exception 'Réponse inconnue';
  end if;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
  select suggestion.wedding_id, auth.uid(), 'reminder', body, m.user_id
  from public.wedding_members m
  where m.wedding_id = suggestion.wedding_id
    and m.member_role = 'couple';
end;
$$;

revoke all on function public.answer_couple_counter(uuid, text) from public, anon;
grant execute on function public.answer_couple_counter(uuid, text) to authenticated;
