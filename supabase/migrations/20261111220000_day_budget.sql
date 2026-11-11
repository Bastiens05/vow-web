-- Calm day-version notices, a retractable couple note, and a paid flag on budget lines.
-- Apply after 20261111200000_couple_vendor_invite.sql.

create or replace function public.set_rain_plan(p_wedding uuid, p_active boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  body text;
begin
  if not public.is_wedding_couple(p_wedding) then
    raise exception 'Seul le couple choisit la version du jour';
  end if;
  insert into public.rain_plans (wedding_id, active)
  values (p_wedding, p_active)
  on conflict (wedding_id) do update set active = excluded.active;

  if p_active then
    body := 'Le programme du jour passe en version mauvais temps.';
  else
    body := 'Le programme du jour repasse en version beau temps.';
  end if;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (p_wedding, auth.uid(), 'reminder', left(body, 500));
  return body;
end;
$$;

create or replace function public.note_couple_change(p_wedding uuid, p_body text)
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
  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (p_wedding, auth.uid(), 'reminder', left(p_body, 500))
  returning id into note;
  return note;
end;
$$;

create or replace function public.retract_couple_note(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.wedding_notifications
  where id = p_id and author_id = auth.uid();
end;
$$;

revoke all on function public.note_couple_change(uuid, text) from public, anon;
revoke all on function public.retract_couple_note(uuid) from public, anon;
grant execute on function public.note_couple_change(uuid, text) to authenticated;
grant execute on function public.retract_couple_note(uuid) to authenticated;

alter table public.budget_lines
  add column if not exists paid boolean not null default false,
  add column if not exists vendor_user_id uuid references public.profiles (id) on delete set null;
