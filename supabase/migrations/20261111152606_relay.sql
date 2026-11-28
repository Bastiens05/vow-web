-- Handoff, rain plan, technical needs, weather thresholds and tracked
-- recommendations. Timeline text stays couple-only. Apply after daypack.

create table if not exists public.timeline_assignees (
  slot_id uuid not null references public.timeline_slots (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (slot_id, user_id)
);

create table if not exists public.timeline_ready (
  slot_id uuid primary key references public.timeline_slots (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  ready_at timestamptz not null default now()
);

create table if not exists public.rain_plans (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  active boolean not null default false,
  note text not null default '',
  constraint rain_plans_note check (char_length(note) <= 300)
);

create table if not exists public.rain_stops (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  label text not null,
  address text not null,
  sort_order integer not null default 0,
  constraint rain_stops_label check (char_length(btrim(label)) between 1 and 80),
  constraint rain_stops_address check (char_length(btrim(address)) between 3 and 240)
);

create table if not exists public.rain_slots (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null,
  starts_at time not null,
  place text not null default '',
  sort_order integer not null default 0,
  constraint rain_slots_title check (char_length(btrim(title)) between 1 and 120)
);

create table if not exists public.technical_needs (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle text not null default '',
  access_start time,
  access_end time,
  parking text not null default '',
  power_w integer not null default 0,
  sockets integer not null default 0,
  setup_minutes integer not null default 0,
  space_note text not null default '',
  primary key (wedding_id, user_id),
  constraint technical_needs_len check (
    char_length(vehicle) <= 80
    and char_length(parking) <= 80
    and char_length(space_note) <= 300
  ),
  constraint technical_needs_numbers check (
    power_w between 0 and 1000000
    and sockets between 0 and 200
    and setup_minutes between 0 and 1440
  )
);

create table if not exists public.venue_limits (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  power_w integer,
  parking_note text not null default '',
  constraint venue_limits_power check (power_w is null or power_w between 0 and 1000000),
  constraint venue_limits_note check (char_length(parking_note) <= 300)
);

create table if not exists public.weather_settings (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  enabled boolean not null default true,
  rain_mm numeric(6, 1) not null default 1,
  rain_probability integer not null default 50,
  wind_kmh integer not null default 40,
  latitude double precision,
  longitude double precision,
  constraint weather_settings_bounds check (
    rain_mm >= 0 and rain_mm <= 500
    and rain_probability between 0 and 100
    and wind_kmh between 0 and 300
  )
);

create table if not exists public.weather_checks (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  checked_on date not null,
  primary key (wedding_id, checked_on)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now(),
  constraint recommendation_events_kind check (kind in ('click', 'lead'))
);

alter table public.leads
  add column if not exists recommendation_id uuid references public.recommendations (id) on delete set null;

alter table public.timeline_assignees enable row level security;
alter table public.timeline_ready enable row level security;
alter table public.rain_plans enable row level security;
alter table public.rain_stops enable row level security;
alter table public.rain_slots enable row level security;
alter table public.technical_needs enable row level security;
alter table public.venue_limits enable row level security;
alter table public.weather_settings enable row level security;
alter table public.weather_checks enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_events enable row level security;

create or replace function public.assign_timeline_step(p_slot uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
begin
  select wedding_id into wid from public.timeline_slots where id = p_slot;
  if wid is null or not public.is_wedding_couple(wid) then
    raise exception 'Seul le couple attribue une étape';
  end if;
  if not public.is_wedding_vendor(wid) and not exists (
    select 1 from public.wedding_members
    where wedding_id = wid and user_id = p_user and member_role = 'vendor'
  ) then
    raise exception 'Ce prestataire n''est pas sur le mariage';
  end if;
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = wid and user_id = p_user and member_role = 'vendor'
  ) then
    raise exception 'Ce prestataire n''est pas sur le mariage';
  end if;
  insert into public.timeline_assignees (slot_id, user_id) values (p_slot, p_user)
  on conflict do nothing;
end;
$$;

create or replace function public.clear_timeline_step(p_slot uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
begin
  select wedding_id into wid from public.timeline_slots where id = p_slot;
  if wid is null or not public.is_wedding_couple(wid) then
    raise exception 'Seul le couple retire une attribution';
  end if;
  delete from public.timeline_assignees where slot_id = p_slot and user_id = p_user;
end;
$$;

create or replace function public.mark_step_ready(p_slot uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  slot public.timeline_slots%rowtype;
  nxt public.timeline_slots%rowtype;
  ids uuid[];
  body text;
begin
  select * into slot from public.timeline_slots where id = p_slot;
  if not found then
    raise exception 'Étape introuvable';
  end if;
  if not exists (
    select 1 from public.timeline_assignees
    where slot_id = p_slot and user_id = auth.uid()
  ) then
    raise exception 'Cette étape n''est pas la vôtre';
  end if;
  insert into public.timeline_ready (slot_id, wedding_id, user_id)
  values (slot.id, slot.wedding_id, auth.uid())
  on conflict (slot_id) do nothing;
  if not found then
    return jsonb_build_object('wedding_id', slot.wedding_id, 'body', '', 'user_ids', '[]'::jsonb);
  end if;

  select * into nxt
  from public.timeline_slots
  where wedding_id = slot.wedding_id
    and (starts_at, sort_order, id) > (slot.starts_at, slot.sort_order, slot.id)
  order by starts_at, sort_order, id
  limit 1;

  select coalesce(array_agg(user_id), '{}') into ids
  from public.timeline_assignees
  where slot_id = nxt.id;

  body := slot.title || ' : c''est prêt.';
  if nxt.id is not null then
    body := body || ' À vous : ' || nxt.title || '.';
  end if;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (slot.wedding_id, auth.uid(), 'alert', left(body, 500));

  return jsonb_build_object(
    'wedding_id', slot.wedding_id,
    'body', body,
    'user_ids', coalesce((select jsonb_agg(x) from unnest(ids) x), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_rain_plan(p_wedding uuid, p_active boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  place text;
  body text;
begin
  if not public.is_wedding_couple(p_wedding) then
    raise exception 'Seul le couple active le plan pluie';
  end if;
  insert into public.rain_plans (wedding_id, active)
  values (p_wedding, p_active)
  on conflict (wedding_id) do update set active = excluded.active;

  select label || ' — ' || address into place
  from public.rain_stops
  where wedding_id = p_wedding
  order by sort_order
  limit 1;

  if p_active then
    body := 'Plan pluie activé' || case when place is null then '.' else ' : ' || place || '.' end;
  else
    body := 'Plan pluie retiré. On revient au déroulé prévu.';
  end if;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (p_wedding, auth.uid(), 'alert', left(body, 500));
  return body;
end;
$$;

create or replace function public.due_weather_weddings()
returns table (
  wedding_id uuid,
  wedding_date date,
  place text,
  latitude double precision,
  longitude double precision,
  rain_mm numeric,
  rain_probability integer,
  wind_kmh integer
)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.wedding_date,
    coalesce(nullif(w.venue_city, ''), nullif(w.venue_name, ''), 'France'),
    s.latitude, s.longitude, s.rain_mm, s.rain_probability, s.wind_kmh
  from public.weddings w
  join public.weather_settings s on s.wedding_id = w.id and s.enabled
  where w.is_demo = false
    and w.wedding_date between current_date and current_date + 7
    and not exists (
      select 1 from public.weather_checks c
      where c.wedding_id = w.id and c.checked_on = current_date
    );
$$;

create or replace function public.record_weather_alert(
  p_wedding uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  author uuid;
begin
  insert into public.weather_checks (wedding_id, checked_on)
  values (p_wedding, current_date)
  on conflict do nothing;
  if p_body is null or btrim(p_body) = '' then
    return;
  end if;
  select user_id into author
  from public.wedding_members
  where wedding_id = p_wedding and member_role = 'couple'
  limit 1;
  if author is null then
    select created_by into author from public.weddings where id = p_wedding;
  end if;
  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (p_wedding, author, 'alert', left(p_body, 500));
end;
$$;

create or replace function public.set_venue_point(p_wedding uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.weather_settings
  set latitude = p_lat, longitude = p_lng
  where wedding_id = p_wedding and latitude is null;
end;
$$;

create or replace function public.record_reco_click(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.recommendations%rowtype;
  slug text;
begin
  select * into rec from public.recommendations where token = p_token;
  if not found then
    return null;
  end if;
  insert into public.recommendation_events (recommendation_id, kind) values (rec.id, 'click');
  select v.slug into slug from public.vendor_profiles v where v.id = rec.vendor_id;
  return slug;
end;
$$;

create or replace function public.attribute_quote(p_lead uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.recommendations%rowtype;
  lead public.leads%rowtype;
begin
  select * into rec from public.recommendations where token = p_token;
  if not found then
    return;
  end if;
  select * into lead from public.leads where id = p_lead;
  if not found or lead.vendor_id is distinct from rec.vendor_id then
    return;
  end if;
  update public.leads set recommendation_id = rec.id where id = lead.id and recommendation_id is null;
  insert into public.recommendation_events (recommendation_id, kind) values (rec.id, 'lead');
end;
$$;

revoke all on function public.assign_timeline_step(uuid, uuid) from public, anon;
revoke all on function public.clear_timeline_step(uuid, uuid) from public, anon;
revoke all on function public.mark_step_ready(uuid) from public, anon;
revoke all on function public.set_rain_plan(uuid, boolean) from public, anon;
revoke all on function public.due_weather_weddings() from public;
revoke all on function public.record_weather_alert(uuid, text) from public;
revoke all on function public.set_venue_point(uuid, double precision, double precision) from public;
revoke all on function public.record_reco_click(text) from public;
revoke all on function public.attribute_quote(uuid, text) from public;

grant execute on function public.assign_timeline_step(uuid, uuid) to authenticated;
grant execute on function public.clear_timeline_step(uuid, uuid) to authenticated;
grant execute on function public.mark_step_ready(uuid) to authenticated;
grant execute on function public.set_rain_plan(uuid, boolean) to authenticated;
grant execute on function public.due_weather_weddings() to anon, authenticated;
grant execute on function public.record_weather_alert(uuid, text) to anon, authenticated;
grant execute on function public.set_venue_point(uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.record_reco_click(text) to anon, authenticated;
grant execute on function public.attribute_quote(uuid, text) to anon, authenticated;

drop policy if exists timeline_assignees_select on public.timeline_assignees;
drop policy if exists timeline_ready_select on public.timeline_ready;
drop policy if exists rain_plans_select on public.rain_plans;
drop policy if exists rain_plans_couple on public.rain_plans;
drop policy if exists rain_stops_select on public.rain_stops;
drop policy if exists rain_stops_couple on public.rain_stops;
drop policy if exists rain_slots_select on public.rain_slots;
drop policy if exists rain_slots_couple on public.rain_slots;
drop policy if exists technical_needs_select on public.technical_needs;
drop policy if exists technical_needs_write on public.technical_needs;
drop policy if exists venue_limits_select on public.venue_limits;
drop policy if exists venue_limits_couple on public.venue_limits;
drop policy if exists weather_settings_select on public.weather_settings;
drop policy if exists weather_settings_couple on public.weather_settings;
drop policy if exists weather_checks_select on public.weather_checks;
drop policy if exists recommendations_select on public.recommendations;
drop policy if exists recommendations_insert on public.recommendations;
drop policy if exists recommendation_events_select on public.recommendation_events;

create policy timeline_assignees_select on public.timeline_assignees
  for select to authenticated
  using (exists (
    select 1 from public.timeline_slots s
    where s.id = slot_id and public.is_wedding_member(s.wedding_id)
  ));

create policy timeline_ready_select on public.timeline_ready
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy rain_plans_select on public.rain_plans
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy rain_plans_couple on public.rain_plans
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy rain_stops_select on public.rain_stops
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy rain_stops_couple on public.rain_stops
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy rain_slots_select on public.rain_slots
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy rain_slots_couple on public.rain_slots
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy technical_needs_select on public.technical_needs
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy technical_needs_write on public.technical_needs
  for all to authenticated
  using (user_id = auth.uid() and public.is_wedding_vendor(wedding_id))
  with check (user_id = auth.uid() and public.is_wedding_vendor(wedding_id));

create policy venue_limits_select on public.venue_limits
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy venue_limits_couple on public.venue_limits
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy weather_settings_select on public.weather_settings
  for select to authenticated using (public.is_wedding_member(wedding_id));
create policy weather_settings_couple on public.weather_settings
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy weather_checks_select on public.weather_checks
  for select to authenticated using (public.is_wedding_member(wedding_id));

create policy recommendations_select on public.recommendations
  for select to authenticated
  using (
    from_user_id = auth.uid()
    or exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid())
  );
create policy recommendations_insert on public.recommendations
  for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and public.is_wedding_vendor(wedding_id)
    and exists (
      select 1 from public.vendor_profiles v
      join public.wedding_members m on m.user_id = v.user_id and m.wedding_id = recommendations.wedding_id
      where v.id = vendor_id and v.user_id <> auth.uid() and m.member_role = 'vendor'
    )
  );

create policy recommendation_events_select on public.recommendation_events
  for select to authenticated
  using (exists (
    select 1 from public.recommendations r
    where r.id = recommendation_id
      and (
        r.from_user_id = auth.uid()
        or exists (select 1 from public.vendor_profiles v where v.id = r.vendor_id and v.user_id = auth.uid())
      )
  ));

grant select on public.timeline_assignees, public.timeline_ready, public.rain_plans, public.rain_stops, public.rain_slots,
  public.technical_needs, public.venue_limits, public.weather_settings, public.weather_checks,
  public.recommendations, public.recommendation_events to authenticated;
grant insert, update, delete on public.rain_plans, public.rain_stops, public.rain_slots, public.venue_limits, public.weather_settings to authenticated;
grant insert, update, delete on public.technical_needs to authenticated;
grant insert on public.recommendations to authenticated;

alter table public.timeline_ready replica identity full;
alter table public.rain_plans replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timeline_ready'
    ) then
      alter publication supabase_realtime add table public.timeline_ready;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rain_plans'
    ) then
      alter publication supabase_realtime add table public.rain_plans;
    end if;
  end if;
end $$;
