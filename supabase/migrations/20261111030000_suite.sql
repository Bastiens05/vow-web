-- Team, calendar, appointments, RSVP, seating, budget and the couple site.
-- Free: no paid API. Apply after 20261111020000_mail.sql.

alter table public.mail_outbox drop constraint if exists mail_outbox_kind;
alter table public.mail_outbox
  add constraint mail_outbox_kind check (kind in ('lead', 'reminder', 'deposit', 'appointment'));

create table if not exists public.vendor_members (
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (vendor_id, user_id),
  constraint vendor_members_role check (team_role in ('owner', 'member'))
);

create table if not exists public.vendor_team_invites (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  email text not null,
  token text not null unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint vendor_team_invites_email check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  weekday smallint not null,
  start_time time not null,
  end_time time not null,
  constraint availability_weekday check (weekday between 0 and 6),
  constraint availability_order check (end_time > start_time),
  unique (vendor_id, weekday, start_time)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  wedding_id uuid references public.weddings (id) on delete set null,
  full_name text not null,
  email text not null,
  starts_at timestamptz not null,
  note text not null default '',
  status text not null default 'confirmed',
  ics_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  constraint appointments_status check (status in ('confirmed', 'cancelled')),
  constraint appointments_name check (char_length(btrim(full_name)) between 2 and 120),
  constraint appointments_email check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint appointments_note check (char_length(note) <= 500)
);

create table if not exists public.rsvp_pages (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  token text not null unique,
  enabled boolean not null default true
);

create table if not exists public.rsvp_answers (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  full_name text not null,
  attending boolean not null,
  diet text not null default '',
  created_at timestamptz not null default now(),
  constraint rsvp_answers_name check (char_length(btrim(full_name)) between 2 and 120),
  constraint rsvp_answers_diet check (char_length(diet) <= 200)
);

create table if not exists public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  capacity integer not null default 8,
  sort_order integer not null default 0,
  constraint seating_tables_name check (char_length(btrim(name)) between 1 and 40),
  constraint seating_tables_capacity check (capacity between 1 and 30)
);

create table if not exists public.seating_assignments (
  guest_id uuid primary key references public.guests (id) on delete cascade,
  table_id uuid not null references public.seating_tables (id) on delete cascade
);

create table if not exists public.wedding_budgets (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  total_cents integer not null default 0,
  constraint wedding_budgets_total check (total_cents >= 0 and total_cents <= 100000000)
);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  label text not null,
  amount_cents integer not null,
  sort_order integer not null default 0,
  constraint budget_lines_label check (char_length(btrim(label)) between 1 and 80),
  constraint budget_lines_amount check (amount_cents >= 0 and amount_cents <= 100000000)
);

create table if not exists public.wedding_sites (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  slug text not null unique,
  published boolean not null default false,
  place text not null default '',
  programme text not null default '',
  note text not null default '',
  constraint wedding_sites_slug check (slug ~ '^[a-z0-9-]{3,60}$'),
  constraint wedding_sites_len check (
    char_length(place) <= 160
    and char_length(programme) <= 2000
    and char_length(note) <= 500
  )
);

create table if not exists public.calendar_feeds (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null unique,
  revoked_at timestamptz
);

alter table public.vendor_members enable row level security;
alter table public.vendor_team_invites enable row level security;
alter table public.availability_rules enable row level security;
alter table public.appointments enable row level security;
alter table public.rsvp_pages enable row level security;
alter table public.rsvp_answers enable row level security;
alter table public.seating_tables enable row level security;
alter table public.seating_assignments enable row level security;
alter table public.wedding_budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.wedding_sites enable row level security;
alter table public.calendar_feeds enable row level security;

create or replace function public.is_vendor_owner(p_vendor uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vendor_profiles where id = p_vendor and user_id = auth.uid()
  );
$$;

create or replace function public.is_vendor_staff(p_vendor uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_vendor_owner(p_vendor)
    or exists (
      select 1 from public.vendor_members
      where vendor_id = p_vendor and user_id = auth.uid()
    );
$$;

create or replace function public.is_wedding_staff(p_wedding uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.wedding_members wm
    join public.vendor_profiles v on v.user_id = wm.user_id
    where wm.wedding_id = p_wedding
      and wm.member_role = 'vendor'
      and public.is_vendor_staff(v.id)
  );
$$;

create or replace function public.staff_wedding_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select wm.wedding_id
  from public.wedding_members wm
  join public.vendor_profiles v on v.user_id = wm.user_id
  join public.vendor_members m on m.vendor_id = v.id and m.user_id = auth.uid()
  where wm.member_role = 'vendor';
$$;

create or replace function public.accept_team_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  invite public.vendor_team_invites%rowtype;
  uid uuid := auth.uid();
  account public.app_role;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select * into invite from public.vendor_team_invites where token = p_token;
  if not found or invite.expires_at <= now() then
    raise exception 'Invitation introuvable';
  end if;
  if invite.accepted_at is not null then
    return invite.vendor_id;
  end if;
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(invite.email) then
    raise exception 'Cette invitation est destinée à une autre adresse';
  end if;
  select role into account from public.profiles where id = uid;
  if account is distinct from 'vendor' then
    raise exception 'Le compte doit être un compte prestataire';
  end if;
  insert into public.vendor_members (vendor_id, user_id, team_role)
  values (invite.vendor_id, uid, 'member')
  on conflict (vendor_id, user_id) do nothing;
  update public.vendor_team_invites set accepted_at = now() where id = invite.id;
  return invite.vendor_id;
end;
$$;

create or replace function public.open_slots(p_slug text, p_day date)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  select (p_day + r.start_time) at time zone 'Europe/Paris'
  from public.availability_rules r
  join public.vendor_profiles v on v.id = r.vendor_id
  where v.slug = p_slug
    and v.published
    and r.weekday = extract(dow from p_day)::smallint
    and (p_day + r.start_time) at time zone 'Europe/Paris' > now()
    and not exists (
      select 1 from public.appointments a
      where a.vendor_id = v.id
        and a.status = 'confirmed'
        and a.starts_at = (p_day + r.start_time) at time zone 'Europe/Paris'
    )
  order by 1;
$$;

create or replace function public.book_appointment(
  p_slug text,
  p_name text,
  p_email text,
  p_starts timestamptz,
  p_note text,
  p_wedding uuid
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  vid uuid;
  vendor_email text;
  vendor_name text;
  wants boolean;
  appt uuid;
  token text;
  clean text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Indiquez votre nom';
  end if;
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Indiquez un e-mail valide';
  end if;
  select v.id, p.email, v.business_name, p.notify_email
  into vid, vendor_email, vendor_name, wants
  from public.vendor_profiles v
  join public.profiles p on p.id = v.user_id
  where v.slug = p_slug and v.published;
  if vid is null then
    raise exception 'Ce prestataire ne prend pas de rendez-vous';
  end if;
  if p_wedding is not null and not public.is_wedding_couple(p_wedding) then
    raise exception 'Seul le couple de ce mariage peut réserver ici';
  end if;
  if not exists (
    select 1 from public.availability_rules r
    where r.vendor_id = vid
      and r.weekday = extract(dow from (p_starts at time zone 'Europe/Paris'))::smallint
      and r.start_time = (p_starts at time zone 'Europe/Paris')::time
  ) then
    raise exception 'Ce créneau n''est pas ouvert';
  end if;
  if exists (
    select 1 from public.appointments a
    where a.vendor_id = vid and a.status = 'confirmed' and a.starts_at = p_starts
  ) then
    raise exception 'Ce créneau vient d''être pris';
  end if;

  insert into public.appointments (vendor_id, wedding_id, full_name, email, starts_at, note)
  values (vid, p_wedding, btrim(p_name), clean, p_starts, left(btrim(coalesce(p_note, '')), 500))
  returning id, ics_token into appt, token;

  insert into public.mail_outbox (kind, to_email, subject, heading, body, button_label, button_url)
  values (
    'appointment',
    clean,
    'Rendez-vous confirmé · ' || left(vendor_name, 80),
    'C''est noté',
    'Votre rendez-vous avec ' || left(vendor_name, 80) || ' est confirmé.',
    'Ajouter au calendrier',
    '/api/calendar/appointment/' || token
  );
  if wants and vendor_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    insert into public.mail_outbox (kind, to_email, subject, heading, body, button_label, button_url)
    values (
      'appointment',
      vendor_email,
      'Nouveau rendez-vous',
      btrim(p_name),
      'Un rendez-vous vient d''être réservé.',
      'Voir les rendez-vous',
      '/espace/rendez-vous'
    );
  end if;
  return appt;
end;
$$;

create or replace function public.submit_rsvp(
  p_token text,
  p_name text,
  p_attending boolean,
  p_diet text
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  page public.rsvp_pages%rowtype;
  answers integer;
begin
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Indiquez votre nom';
  end if;
  select * into page from public.rsvp_pages where token = p_token and enabled;
  if not found then
    raise exception 'Ce lien ne répond plus';
  end if;
  select count(*) into answers from public.rsvp_answers where wedding_id = page.wedding_id;
  if answers >= 400 then
    raise exception 'La liste est complète';
  end if;
  insert into public.rsvp_answers (wedding_id, full_name, attending, diet)
  values (page.wedding_id, btrim(p_name), coalesce(p_attending, false), left(btrim(coalesce(p_diet, '')), 200));
  if coalesce(p_attending, false) then
    insert into public.guests (wedding_id, full_name, dietary)
    values (page.wedding_id, btrim(p_name), left(btrim(coalesce(p_diet, '')), 200));
  end if;
  return true;
end;
$$;

create or replace function public.ensure_calendar_feed()
returns text
language plpgsql security definer set search_path = public as $$
declare
  existing text;
  fresh text;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  select token into existing from public.calendar_feeds where user_id = auth.uid() and revoked_at is null;
  if existing is not null then
    return existing;
  end if;
  fresh := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.calendar_feeds (user_id, token)
  values (auth.uid(), fresh)
  on conflict (user_id) do update set token = excluded.token, revoked_at = null;
  return fresh;
end;
$$;

create or replace function public.rotate_calendar_feed()
returns text
language plpgsql security definer set search_path = public as $$
declare
  fresh text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  insert into public.calendar_feeds (user_id, token)
  values (auth.uid(), fresh)
  on conflict (user_id) do update set token = excluded.token, revoked_at = null;
  return fresh;
end;
$$;

create or replace function public.calendar_events(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid;
  result jsonb;
begin
  select user_id into uid from public.calendar_feeds where token = p_token and revoked_at is null;
  if uid is null then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(event), '[]'::jsonb) into result
  from (
    select jsonb_build_object(
      'uid', w.id::text || '@vow',
      'title', w.partner_one_name || ' & ' || w.partner_two_name,
      'start', w.wedding_date::text,
      'end', null,
      'allDay', true
    ) as event
    from public.weddings w
    join public.wedding_members m on m.wedding_id = w.id and m.user_id = uid
    union all
    select jsonb_build_object(
      'uid', s.id::text || '@vow',
      'title', s.title,
      'start', to_char(w.wedding_date, 'YYYY-MM-DD') || 'T' || to_char(s.starts_at, 'HH24:MI:SS'),
      'end', to_char(w.wedding_date, 'YYYY-MM-DD') || 'T' || to_char(s.starts_at + interval '1 hour', 'HH24:MI:SS'),
      'allDay', false
    )
    from public.timeline_slots s
    join public.weddings w on w.id = s.wedding_id
    join public.wedding_members m on m.wedding_id = w.id and m.user_id = uid
    where s.starts_at is not null
    union all
    select jsonb_build_object(
      'uid', a.id::text || '@vow',
      'title', 'Rendez-vous · ' || a.full_name,
      'start', to_char(a.starts_at at time zone 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'end', to_char((a.starts_at + interval '1 hour') at time zone 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'allDay', false
    )
    from public.appointments a
    join public.vendor_profiles v on v.id = a.vendor_id
    where a.status = 'confirmed'
      and (v.user_id = uid or lower(a.email) = lower((select email from public.profiles where id = uid)))
  ) rows;
  return result;
end;
$$;

create or replace function public.appointment_event(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'uid', a.id::text || '@vow',
    'title', 'Rendez-vous VOW',
    'start', to_char(a.starts_at at time zone 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'end', to_char((a.starts_at + interval '1 hour') at time zone 'Europe/Paris', 'YYYY-MM-DD"T"HH24:MI:SS'),
    'allDay', false
  ) into result
  from public.appointments a
  where a.ics_token = p_token and a.status = 'confirmed';
  return result;
end;
$$;

revoke all on function public.is_vendor_owner(uuid) from public, anon;
revoke all on function public.is_vendor_staff(uuid) from public, anon;
revoke all on function public.is_wedding_staff(uuid) from public, anon;
revoke all on function public.staff_wedding_ids() from public, anon;
revoke all on function public.accept_team_invite(text) from public, anon;
revoke all on function public.book_appointment(text, text, text, timestamptz, text, uuid) from public;
revoke all on function public.submit_rsvp(text, text, boolean, text) from public;
revoke all on function public.ensure_calendar_feed() from public, anon;
revoke all on function public.rotate_calendar_feed() from public, anon;
revoke all on function public.calendar_events(text) from public;
revoke all on function public.appointment_event(text) from public;

grant execute on function public.is_vendor_owner(uuid) to authenticated;
grant execute on function public.is_vendor_staff(uuid) to authenticated;
grant execute on function public.is_wedding_staff(uuid) to authenticated;
grant execute on function public.staff_wedding_ids() to authenticated;
grant execute on function public.accept_team_invite(text) to authenticated;
revoke all on function public.open_slots(text, date) from public;
grant execute on function public.open_slots(text, date) to anon, authenticated;
grant execute on function public.book_appointment(text, text, text, timestamptz, text, uuid) to anon, authenticated;
grant execute on function public.submit_rsvp(text, text, boolean, text) to anon, authenticated;
grant execute on function public.ensure_calendar_feed() to authenticated;
grant execute on function public.rotate_calendar_feed() to authenticated;
grant execute on function public.calendar_events(text) to anon, authenticated;
grant execute on function public.appointment_event(text) to anon, authenticated;

drop policy if exists vendor_members_select on public.vendor_members;
drop policy if exists vendor_members_owner_write on public.vendor_members;
drop policy if exists vendor_team_invites_owner on public.vendor_team_invites;
drop policy if exists availability_owner on public.availability_rules;
drop policy if exists availability_staff_select on public.availability_rules;
drop policy if exists appointments_select on public.appointments;
drop policy if exists appointments_owner_update on public.appointments;
drop policy if exists rsvp_pages_couple on public.rsvp_pages;
drop policy if exists rsvp_answers_couple on public.rsvp_answers;
drop policy if exists seating_tables_read on public.seating_tables;
drop policy if exists seating_tables_couple on public.seating_tables;
drop policy if exists seating_assignments_read on public.seating_assignments;
drop policy if exists seating_assignments_couple on public.seating_assignments;
drop policy if exists wedding_budgets_couple on public.wedding_budgets;
drop policy if exists budget_lines_couple on public.budget_lines;
drop policy if exists wedding_sites_couple on public.wedding_sites;
drop policy if exists wedding_sites_public on public.wedding_sites;
drop policy if exists calendar_feeds_own on public.calendar_feeds;
drop policy if exists weddings_staff_select on public.weddings;
drop policy if exists wedding_members_staff_select on public.wedding_members;
drop policy if exists profiles_staff_select on public.profiles;
drop policy if exists messages_staff_select on public.messages;
drop policy if exists messages_staff_insert on public.messages;
drop policy if exists documents_staff_select on public.documents;
drop policy if exists timeline_slots_staff_select on public.timeline_slots;
drop policy if exists leads_staff_select on public.leads;

create policy vendor_members_select on public.vendor_members
  for select to authenticated
  using (public.is_vendor_staff(vendor_id) or user_id = auth.uid());
create policy vendor_members_owner_write on public.vendor_members
  for all to authenticated
  using (public.is_vendor_owner(vendor_id))
  with check (public.is_vendor_owner(vendor_id));

create policy vendor_team_invites_owner on public.vendor_team_invites
  for all to authenticated
  using (public.is_vendor_owner(vendor_id))
  with check (public.is_vendor_owner(vendor_id));

create policy availability_owner on public.availability_rules
  for all to authenticated
  using (public.is_vendor_owner(vendor_id))
  with check (public.is_vendor_owner(vendor_id));
create policy availability_staff_select on public.availability_rules
  for select to authenticated
  using (public.is_vendor_staff(vendor_id));

create policy appointments_select on public.appointments
  for select to authenticated
  using (
    public.is_vendor_staff(vendor_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or (wedding_id is not null and public.is_wedding_couple(wedding_id))
  );
create policy appointments_owner_update on public.appointments
  for update to authenticated
  using (public.is_vendor_owner(vendor_id))
  with check (public.is_vendor_owner(vendor_id));

create policy rsvp_pages_couple on public.rsvp_pages
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));
create policy rsvp_answers_couple on public.rsvp_answers
  for select to authenticated
  using (public.is_wedding_couple(wedding_id));

create policy seating_tables_read on public.seating_tables
  for select to authenticated
  using (public.is_wedding_couple(wedding_id) or public.can_see_sheet(wedding_id, 'guests'));
create policy seating_tables_couple on public.seating_tables
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy seating_assignments_read on public.seating_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.seating_tables t
      where t.id = table_id
        and (public.is_wedding_couple(t.wedding_id) or public.can_see_sheet(t.wedding_id, 'guests'))
    )
  );
create policy seating_assignments_couple on public.seating_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.seating_tables t
      where t.id = table_id and public.is_wedding_couple(t.wedding_id)
    )
  )
  with check (
    exists (
      select 1 from public.seating_tables t
      join public.guests g on g.wedding_id = t.wedding_id and g.id = guest_id
      where t.id = table_id and public.is_wedding_couple(t.wedding_id)
    )
  );

create policy wedding_budgets_couple on public.wedding_budgets
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));
create policy budget_lines_couple on public.budget_lines
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy wedding_sites_couple on public.wedding_sites
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));
create policy wedding_sites_public on public.wedding_sites
  for select to anon, authenticated
  using (published = true);

create policy calendar_feeds_own on public.calendar_feeds
  for select to authenticated
  using (user_id = auth.uid());

create policy weddings_staff_select on public.weddings
  for select to authenticated using (public.is_wedding_staff(id));
create policy wedding_members_staff_select on public.wedding_members
  for select to authenticated using (public.is_wedding_staff(wedding_id));
create policy profiles_staff_select on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.wedding_members them
      where them.user_id = profiles.id and public.is_wedding_staff(them.wedding_id)
    )
  );
create policy messages_staff_select on public.messages
  for select to authenticated using (public.is_wedding_staff(wedding_id));
create policy messages_staff_insert on public.messages
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_wedding_staff(wedding_id));
create policy documents_staff_select on public.documents
  for select to authenticated using (public.is_wedding_staff(wedding_id));
create policy timeline_slots_staff_select on public.timeline_slots
  for select to authenticated using (public.is_wedding_staff(wedding_id));
create policy leads_staff_select on public.leads
  for select to authenticated using (public.is_vendor_staff(vendor_id));

grant select on public.vendor_members, public.vendor_team_invites, public.availability_rules, public.appointments to authenticated;
grant select, insert, update, delete on public.vendor_team_invites, public.availability_rules to authenticated;
grant select, delete on public.vendor_members to authenticated;
grant update on public.appointments to authenticated;
grant select, insert, update, delete on public.rsvp_pages, public.seating_tables, public.seating_assignments, public.wedding_budgets, public.budget_lines, public.wedding_sites to authenticated;
grant select on public.rsvp_answers to authenticated;
grant select on public.calendar_feeds to authenticated;
grant select on public.wedding_sites to anon;

create or replace function public.public_site(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'one', w.partner_one_name,
    'two', w.partner_two_name,
    'date', w.wedding_date,
    'venue', w.venue_name,
    'place', s.place,
    'programme', s.programme,
    'note', s.note,
    'rsvp', case when r.enabled then r.token else null end
  )
  from public.wedding_sites s
  join public.weddings w on w.id = s.wedding_id
  left join public.rsvp_pages r on r.wedding_id = s.wedding_id
  where s.slug = p_slug
    and s.published;
$$;

revoke all on function public.public_site(text) from public;
grant execute on function public.public_site(text) to anon, authenticated;
