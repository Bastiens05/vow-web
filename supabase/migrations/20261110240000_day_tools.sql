-- Quote requests, personal timeline templates, in-app reminders and
-- simple electronic signatures. Apply after 20261110233000_shell.sql.

alter table public.wedding_notifications drop constraint if exists wedding_notifications_kind;
alter table public.wedding_notifications
  add constraint wedding_notifications_kind check (kind in ('shift', 'alert', 'reminder'));

alter table public.weddings
  add column if not exists reminders_enabled boolean not null default true;

-- Only the couple edits the wedding-day timeline. A vendor in couple-preview
-- on their demo wedding passes is_wedding_couple; a real wedding does not.
drop policy if exists timeline_slots_insert on public.timeline_slots;
drop policy if exists timeline_slots_update on public.timeline_slots;
drop policy if exists timeline_slots_delete on public.timeline_slots;

create policy timeline_slots_insert on public.timeline_slots
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_wedding_couple(wedding_id)
  );

create policy timeline_slots_update on public.timeline_slots
  for update to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy timeline_slots_delete on public.timeline_slots
  for delete to authenticated
  using (public.is_wedding_couple(wedding_id));

create table public.timeline_suggestions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  slots jsonb not null,
  created_at timestamptz not null default now(),
  constraint timeline_suggestions_label_len check (char_length(btrim(label)) between 2 and 80),
  constraint timeline_suggestions_slots check (jsonb_typeof(slots) = 'array')
);

alter table public.timeline_suggestions enable row level security;
grant select, insert on public.timeline_suggestions to authenticated;

create policy timeline_suggestions_select on public.timeline_suggestions
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy timeline_suggestions_insert on public.timeline_suggestions
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_wedding_vendor(wedding_id)
    and not public.is_wedding_couple(wedding_id)
  );

create table public.timeline_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slots jsonb not null,
  created_at timestamptz not null default now(),
  constraint timeline_templates_name_len check (char_length(btrim(name)) between 2 and 80),
  constraint timeline_templates_slots_array check (jsonb_typeof(slots) = 'array')
);

alter table public.timeline_templates enable row level security;
grant select, insert, update, delete on public.timeline_templates to authenticated;

create policy timeline_templates_all on public.timeline_templates
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  full_names text not null,
  email text not null,
  phone text not null default '',
  wedding_date date,
  place text not null default '',
  guest_count integer,
  message text not null default '',
  status text not null default 'nouvelle',
  wedding_id uuid references public.weddings (id) on delete set null,
  source_ip text not null default '',
  created_at timestamptz not null default now(),
  constraint leads_status check (status in ('nouvelle', 'en_discussion', 'gagnee', 'perdue')),
  constraint leads_names_len check (char_length(btrim(full_names)) between 2 and 160),
  constraint leads_email check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint leads_message_len check (char_length(message) <= 2000),
  constraint leads_place_len check (char_length(place) <= 160),
  constraint leads_guests check (guest_count is null or guest_count between 0 and 2000)
);

create index leads_vendor_created_idx on public.leads (vendor_id, created_at desc);

alter table public.leads enable row level security;
grant select, update on public.leads to authenticated;

create policy leads_select on public.leads
  for select to authenticated
  using (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = leads.vendor_id and v.user_id = auth.uid()
    )
  );

create policy leads_update on public.leads
  for update to authenticated
  using (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = leads.vendor_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = leads.vendor_id and v.user_id = auth.uid()
    )
  );

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  milestone integer not null,
  kind text not null,
  created_at timestamptz not null default now(),
  constraint reminders_milestone check (milestone in (60, 30, 14)),
  constraint reminders_kind check (kind in ('practical', 'photos', 'guests', 'document', 'signature')),
  unique (wedding_id, milestone, kind)
);

alter table public.reminders enable row level security;
grant select on public.reminders to authenticated;

create policy reminders_select on public.reminders
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create table public.signature_requests (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending',
  signer_name text not null default '',
  signature_path text not null default '',
  consent_at timestamptz,
  signed_at timestamptz,
  signed_by uuid references public.profiles (id) on delete set null,
  signer_ip text not null default '',
  signer_user_agent text not null default '',
  document_sha256 text not null,
  created_at timestamptz not null default now(),
  constraint signature_requests_status check (status in ('pending', 'signed')),
  constraint signature_requests_hash check (document_sha256 ~ '^[0-9a-f]{64}$')
);

alter table public.signature_requests enable row level security;
grant select, insert on public.signature_requests to authenticated;

create policy signature_requests_select on public.signature_requests
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy signature_requests_insert on public.signature_requests
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and status = 'pending'
    and public.is_wedding_vendor(wedding_id)
  );

create or replace function public.submit_quote_request(
  p_slug text,
  p_names text,
  p_email text,
  p_phone text,
  p_wedding_date date,
  p_place text,
  p_guest_count integer,
  p_message text,
  p_ip text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  vid uuid;
  recent integer;
  lead_id uuid;
  clean_email text := lower(btrim(coalesce(p_email, '')));
begin
  if char_length(btrim(coalesce(p_names, ''))) < 2 then
    raise exception 'Indiquez vos noms';
  end if;
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Indiquez un e-mail valide';
  end if;
  if p_message is not null and char_length(p_message) > 2000 then
    raise exception 'Le message est trop long';
  end if;

  select id into vid
  from public.vendor_profiles
  where slug = p_slug and published = true;
  if vid is null then
    raise exception 'Cette page n''accepte pas de demande';
  end if;

  select count(*) into recent
  from public.leads
  where vendor_id = vid
    and created_at > now() - interval '1 hour'
    and (
      email = clean_email
      or (p_ip <> '' and source_ip = p_ip)
    );
  if recent >= 3 then
    raise exception 'Trop de demandes pour le moment. Réessayez dans une heure.';
  end if;

  insert into public.leads (
    vendor_id, full_names, email, phone, wedding_date, place, guest_count, message, source_ip
  )
  values (
    vid,
    btrim(p_names),
    clean_email,
    left(btrim(coalesce(p_phone, '')), 40),
    p_wedding_date,
    left(btrim(coalesce(p_place, '')), 160),
    p_guest_count,
    btrim(coalesce(p_message, '')),
    left(coalesce(p_ip, ''), 64)
  )
  returning id into lead_id;

  return lead_id;
end;
$$;

create or replace function public.emit_reminder(
  p_wedding_id uuid,
  p_author uuid,
  p_milestone integer,
  p_kind text,
  p_body text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reminders (wedding_id, milestone, kind)
  values (p_wedding_id, p_milestone, p_kind);
  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (p_wedding_id, p_author, 'reminder', left(p_body, 500));
  return true;
exception
  when unique_violation then
    return false;
end;
$$;

create or replace function public.run_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  days integer;
  milestone integer;
  sent integer := 0;
  title text;
begin
  for w in
    select id, wedding_date, created_by, partner_one_name, partner_two_name
    from public.weddings
    where reminders_enabled
      and is_demo = false
      and wedding_date >= current_date
      and wedding_date <= current_date + 60
  loop
    days := (w.wedding_date - current_date);
    milestone := case
      when days between 1 and 14 then 14
      when days between 15 and 30 then 30
      when days between 31 and 60 then 60
      else null
    end;
    if milestone is null then
      continue;
    end if;
    title := w.partner_one_name || ' & ' || w.partner_two_name;

    if not exists (
      select 1 from public.wedding_practical p
      where p.wedding_id = w.id
        and (p.postal_address <> '' or p.partner_one_phone <> '' or p.ceremony_address <> '')
    ) then
      if public.emit_reminder(w.id, w.created_by, milestone, 'practical',
        'Rappel J-' || milestone || ' : les infos pratiques de ' || title || ' manquent encore.') then
        sent := sent + 1;
      end if;
    end if;

    if exists (
      select 1
      from public.wedding_members m
      join public.vendor_profiles v on v.user_id = m.user_id
      where m.wedding_id = w.id
        and m.member_role = 'vendor'
        and v.category::text in ('photographer', 'videographer', 'planner')
    ) and not exists (select 1 from public.photo_groups g where g.wedding_id = w.id) then
      if public.emit_reminder(w.id, w.created_by, milestone, 'photos',
        'Rappel J-' || milestone || ' : les photos de groupe de ' || title || ' ne sont pas listées.') then
        sent := sent + 1;
      end if;
    end if;

    if exists (
      select 1
      from public.wedding_members m
      join public.vendor_profiles v on v.user_id = m.user_id
      where m.wedding_id = w.id
        and m.member_role = 'vendor'
        and v.category::text in ('caterer', 'venue', 'planner')
    ) and not exists (select 1 from public.guests g where g.wedding_id = w.id) then
      if public.emit_reminder(w.id, w.created_by, milestone, 'guests',
        'Rappel J-' || milestone || ' : les invités et les régimes de ' || title || ' manquent.') then
        sent := sent + 1;
      end if;
    end if;

    if not exists (select 1 from public.documents d where d.wedding_id = w.id) then
      if public.emit_reminder(w.id, w.created_by, milestone, 'document',
        'Rappel J-' || milestone || ' : aucun document n''est encore déposé pour ' || title || '.') then
        sent := sent + 1;
      end if;
    end if;

    if exists (
      select 1 from public.signature_requests s
      where s.wedding_id = w.id and s.status = 'pending'
    ) then
      if public.emit_reminder(w.id, w.created_by, milestone, 'signature',
        'Rappel J-' || milestone || ' : un contrat attend la signature pour ' || title || '.') then
        sent := sent + 1;
      end if;
    end if;
  end loop;
  return sent;
end;
$$;

create or replace function public.record_signature(
  p_request_id uuid,
  p_name text,
  p_path text,
  p_ip text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.signature_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Indiquez votre nom';
  end if;
  select * into req from public.signature_requests where id = p_request_id;
  if not found or req.status <> 'pending' then
    raise exception 'Cette demande de signature n''est plus ouverte';
  end if;
  if not public.is_wedding_couple(req.wedding_id) then
    raise exception 'Seul le couple peut signer';
  end if;

  update public.signature_requests
  set status = 'signed',
      signer_name = btrim(p_name),
      signature_path = left(coalesce(p_path, ''), 300),
      consent_at = now(),
      signed_at = now(),
      signed_by = auth.uid(),
      signer_ip = left(coalesce(p_ip, ''), 64),
      signer_user_agent = left(coalesce(p_user_agent, ''), 300)
  where id = req.id;
end;
$$;

revoke all on function public.submit_quote_request(text, text, text, text, date, text, integer, text, text) from public;
revoke all on function public.emit_reminder(uuid, uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.run_due_reminders() from public;
revoke all on function public.record_signature(uuid, text, text, text, text) from public, anon;

grant execute on function public.submit_quote_request(text, text, text, text, date, text, integer, text, text) to anon, authenticated;
grant execute on function public.run_due_reminders() to anon, authenticated;
grant execute on function public.record_signature(uuid, text, text, text, text) to authenticated;
