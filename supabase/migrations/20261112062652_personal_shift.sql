-- Cascade keeps one shared note for the couple, and a private note per vendor
-- that only lists the steps assigned to them.

alter table public.wedding_notifications
  add column if not exists recipient_user_id uuid references public.profiles (id) on delete cascade;

drop policy if exists wedding_notifications_select on public.wedding_notifications;
create policy wedding_notifications_select on public.wedding_notifications
  for select to authenticated
  using (
    public.is_wedding_member(wedding_id)
    and (
      recipient_user_id is null
      or recipient_user_id = auth.uid()
      or public.is_wedding_couple(wedding_id)
    )
  );

create or replace function public.notify_shift_personal(p_wedding uuid, p_user uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  note uuid;
begin
  if not public.is_wedding_couple(p_wedding) then
    raise exception 'Réservé aux mariés';
  end if;
  if p_body is null or btrim(p_body) = '' then
    return null;
  end if;
  insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
  values (p_wedding, auth.uid(), 'shift', left(p_body, 500), p_user)
  returning id into note;
  return note;
end;
$$;

revoke all on function public.notify_shift_personal(uuid, uuid, text) from public, anon;
grant execute on function public.notify_shift_personal(uuid, uuid, text) to authenticated;

create or replace function public.undo_timeline_shift(
  p_slot_id uuid,
  p_previous_time time,
  p_notification_id uuid,
  p_cascade boolean,
  p_minutes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  slot public.timeline_slots%rowtype;
  noted_at timestamptz;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select * into slot from public.timeline_slots where id = p_slot_id;
  if not found then
    raise exception 'Moment introuvable';
  end if;
  if not public.is_wedding_couple(slot.wedding_id) then
    raise exception 'Seul le couple peut annuler un décalage';
  end if;
  if p_cascade and p_minutes <> 0 then
    update public.timeline_slots
    set starts_at = starts_at - make_interval(mins => p_minutes)
    where wedding_id = slot.wedding_id
      and id <> slot.id
      and starts_at >= slot.starts_at;
  end if;
  update public.timeline_slots set starts_at = p_previous_time where id = slot.id;
  select created_at into noted_at from public.wedding_notifications where id = p_notification_id;
  delete from public.wedding_notifications
  where wedding_id = slot.wedding_id
    and author_id = uid
    and kind = 'shift'
    and (
      id = p_notification_id
      or (noted_at is not null and created_at between noted_at - interval '5 seconds' and noted_at + interval '5 seconds')
    );
end;
$$;

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
  changes jsonb;
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', a.user_id,
    'title', s.title,
    'new_time', to_char(
      case when s.id = slot.id then p_new_time else s.starts_at + (p_new_time - slot.starts_at) end,
      'HH24:MI'
    )
  )), '[]'::jsonb)
  into changes
  from public.timeline_slots s
  join public.timeline_assignees a on a.slot_id = s.id
  where s.wedding_id = slot.wedding_id
    and (
      s.id = slot.id
      or (
        p_cascade
        and (
          s.starts_at > slot.starts_at
          or (s.starts_at = slot.starts_at and s.sort_order > slot.sort_order)
        )
      )
    );

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

  update public.timeline_slots set starts_at = p_new_time where id = slot.id;

  select coalesce(nullif(btrim(full_name), ''), 'Quelqu''un') into author
  from public.profiles where id = uid;
  clock := to_char(p_new_time, 'HH24') || 'h' || to_char(p_new_time, 'MI');
  if p_cascade then
    body := 'La suite du programme a été décalée. Chaque prestataire est prévenu seulement de ses étapes.';
  else
    body := author || ' a ' || case when minutes > 0 then 'décalé' else 'avancé' end
      || ' ' || slot.title || ' de ' || abs(minutes) || ' '
      || case when abs(minutes) = 1 then 'minute' else 'minutes' end
      || ', c''est désormais à ' || clock || '.';
  end if;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (slot.wedding_id, uid, 'shift', left(body, 500))
  returning id into note_id;

  return jsonb_build_object(
    'notification_id', note_id,
    'wedding_id', slot.wedding_id,
    'body', body,
    'minutes', minutes,
    'changes', case when p_cascade then changes else '[]'::jsonb end
  );
end;
$$;
