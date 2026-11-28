-- Practical sheets shared inside a wedding: couple details, photo groups, guests.
-- Apply after 20261110180000_init.sql. Does not modify existing tables.

create or replace function public.is_wedding_couple(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members
    where wedding_id = wid
      and user_id = auth.uid()
      and member_role = 'couple'
  );
$$;

revoke all on function public.is_wedding_couple(uuid) from public, anon;
grant execute on function public.is_wedding_couple(uuid) to authenticated;

create table public.wedding_practical (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  partner_one_phone text not null default '',
  partner_two_phone text not null default '',
  postal_address text not null default '',
  ceremony_address text not null default '',
  reception_address text not null default '',
  key_contacts text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  constraint wedding_practical_phone_len check (
    char_length(partner_one_phone) <= 40
    and char_length(partner_two_phone) <= 40
  ),
  constraint wedding_practical_address_len check (
    char_length(postal_address) <= 500
    and char_length(ceremony_address) <= 500
    and char_length(reception_address) <= 500
  ),
  constraint wedding_practical_text_len check (
    char_length(key_contacts) <= 2000
    and char_length(notes) <= 2000
  )
);

create table public.photo_groups (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null,
  people text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint photo_groups_title_len check (char_length(btrim(title)) between 1 and 120),
  constraint photo_groups_people_len check (char_length(people) <= 1000),
  constraint photo_groups_notes_len check (char_length(notes) <= 500)
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  full_name text not null,
  table_label text not null default '',
  dietary text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint guests_name_len check (char_length(btrim(full_name)) between 1 and 120),
  constraint guests_table_len check (char_length(table_label) <= 40),
  constraint guests_dietary_len check (char_length(dietary) <= 200),
  constraint guests_notes_len check (char_length(notes) <= 300)
);

create index photo_groups_wedding_idx on public.photo_groups (wedding_id, sort_order);
create index guests_wedding_idx on public.guests (wedding_id, sort_order, full_name);

create trigger wedding_practical_set_updated_at
  before update on public.wedding_practical
  for each row execute function public.set_updated_at();

alter table public.wedding_practical enable row level security;
alter table public.photo_groups enable row level security;
alter table public.guests enable row level security;

grant select, insert, update on public.wedding_practical to authenticated;
grant select, insert, update, delete on public.photo_groups to authenticated;
grant select, insert, update, delete on public.guests to authenticated;

create policy wedding_practical_select on public.wedding_practical
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy wedding_practical_insert on public.wedding_practical
  for insert to authenticated
  with check (public.is_wedding_couple(wedding_id));

create policy wedding_practical_update on public.wedding_practical
  for update to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy photo_groups_select on public.photo_groups
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy photo_groups_insert on public.photo_groups
  for insert to authenticated
  with check (public.is_wedding_member(wedding_id));

create policy photo_groups_update on public.photo_groups
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

create policy photo_groups_delete on public.photo_groups
  for delete to authenticated
  using (public.is_wedding_member(wedding_id));

create policy guests_select on public.guests
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy guests_insert on public.guests
  for insert to authenticated
  with check (public.is_wedding_member(wedding_id));

create policy guests_update on public.guests
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

create policy guests_delete on public.guests
  for delete to authenticated
  using (public.is_wedding_member(wedding_id));

-- Wedding-day alerts. Members can shift a slot or ping the vendors.
-- The sentence is built inside the function so the author cannot be spoofed.

create table public.wedding_notifications (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint wedding_notifications_kind check (kind in ('shift', 'alert')),
  constraint wedding_notifications_body_len check (char_length(body) between 1 and 500)
);

create table public.notification_reads (
  notification_id uuid not null references public.wedding_notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  created_at timestamptz not null default now()
);

create index wedding_notifications_wedding_idx
  on public.wedding_notifications (wedding_id, created_at desc);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.wedding_notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.push_subscriptions enable row level security;

grant select on public.wedding_notifications to authenticated;
grant select, insert on public.notification_reads to authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

create policy wedding_notifications_select on public.wedding_notifications
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy notification_reads_select on public.notification_reads
  for select to authenticated
  using (user_id = auth.uid());

create policy notification_reads_insert on public.notification_reads
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.wedding_notifications n
      where n.id = notification_reads.notification_id
        and public.is_wedding_member(n.wedding_id)
    )
  );

create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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
  if not public.is_wedding_member(slot.wedding_id) then
    raise exception 'Vous n''êtes pas membre de ce mariage';
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
  if not public.is_wedding_member(p_wedding_id) then
    raise exception 'Vous n''êtes pas membre de ce mariage';
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

revoke all on function public.shift_timeline_slot(uuid, time, boolean) from public, anon;
revoke all on function public.post_wedding_alert(uuid, text) from public, anon;
grant execute on function public.shift_timeline_slot(uuid, time, boolean) to authenticated;
grant execute on function public.post_wedding_alert(uuid, text) to authenticated;

alter table public.timeline_slots replica identity full;
alter table public.wedding_notifications replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'timeline_slots'
    ) then
      alter publication supabase_realtime add table public.timeline_slots;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wedding_notifications'
    ) then
      alter publication supabase_realtime add table public.wedding_notifications;
    end if;
  end if;
end $$;
