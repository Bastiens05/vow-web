-- Documents que le prestataire demande à ses clients.
-- La liste n'est copiée sur un mariage que lorsque le couple et le prestataire sont reliés.
-- Aucune suggestion n'est insérée ici.

create table public.vendor_document_templates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  title text not null,
  note text not null default '',
  required boolean not null default true,
  offset_days integer,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint vendor_document_templates_title check (char_length(btrim(title)) between 1 and 120),
  constraint vendor_document_templates_note check (char_length(note) <= 500),
  constraint vendor_document_templates_offset check (offset_days is null or offset_days between -365 and 365)
);

create index vendor_document_templates_vendor_idx
  on public.vendor_document_templates (vendor_id, position, created_at);

create table public.wedding_document_requests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  template_id uuid references public.vendor_document_templates (id) on delete set null,
  title text not null,
  note text not null default '',
  required boolean not null default true,
  due_on date,
  position integer not null default 0,
  status text not null default 'needed',
  file_path text,
  file_name text,
  correction_note text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wedding_document_requests_title check (char_length(btrim(title)) between 1 and 120),
  constraint wedding_document_requests_note check (char_length(note) <= 500),
  constraint wedding_document_requests_status check (status in ('needed', 'sent', 'validated', 'correction')),
  constraint wedding_document_requests_correction check (char_length(correction_note) <= 500)
);

create unique index wedding_document_requests_template_once
  on public.wedding_document_requests (wedding_id, template_id)
  where template_id is not null;

create index wedding_document_requests_wedding_idx
  on public.wedding_document_requests (wedding_id, vendor_id, position);

alter table public.vendor_document_templates enable row level security;
alter table public.wedding_document_requests enable row level security;

revoke all on table public.vendor_document_templates from public, anon;
revoke all on table public.wedding_document_requests from public, anon;
grant select, insert, update, delete on table public.vendor_document_templates to authenticated;
grant select, insert on table public.wedding_document_requests to authenticated;

create policy vendor_document_templates_owner on public.vendor_document_templates
  for all to authenticated
  using (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()))
  with check (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()));

create policy wedding_document_requests_select on public.wedding_document_requests
  for select to authenticated
  using (
    public.is_wedding_couple(wedding_id)
    or exists (
      select 1
      from public.vendor_profiles v
      join public.wedding_members m on m.user_id = v.user_id and m.wedding_id = wedding_document_requests.wedding_id
      where v.id = wedding_document_requests.vendor_id
        and v.user_id = auth.uid()
    )
  );

create policy wedding_document_requests_insert on public.wedding_document_requests
  for insert to authenticated
  with check (
    template_id is null
    and exists (
      select 1
      from public.vendor_profiles v
      join public.wedding_members m on m.user_id = v.user_id and m.wedding_id = wedding_document_requests.wedding_id
      where v.id = wedding_document_requests.vendor_id
        and v.user_id = auth.uid()
        and m.member_role = 'vendor'
    )
  );

create or replace function public.copy_vendor_document_requests(p_wedding uuid, p_vendor uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  wedding_day date;
  vendor_user uuid;
  studio text;
  added integer := 0;
  couple uuid;
begin
  select w.wedding_date, v.user_id, nullif(btrim(v.business_name), '')
    into wedding_day, vendor_user, studio
  from public.weddings w
  join public.vendor_profiles v on v.id = p_vendor
  where w.id = p_wedding;
  if vendor_user is null then
    return 0;
  end if;
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and member_role = 'couple'
  ) then
    return 0;
  end if;
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and user_id = vendor_user and member_role = 'vendor'
  ) then
    return 0;
  end if;

  insert into public.wedding_document_requests (
    wedding_id, vendor_id, template_id, title, note, required, due_on, position
  )
  select
    p_wedding,
    t.vendor_id,
    t.id,
    t.title,
    t.note,
    t.required,
    case
      when t.offset_days is null or wedding_day is null then null
      else (wedding_day + t.offset_days)
    end,
    t.position
  from public.vendor_document_templates t
  where t.vendor_id = p_vendor
    and not exists (
      select 1 from public.wedding_document_requests r
      where r.wedding_id = p_wedding and r.template_id = t.id
    );
  get diagnostics added = row_count;
  if added = 0 then
    return 0;
  end if;

  for couple in
    select user_id from public.wedding_members
    where wedding_id = p_wedding and member_role = 'couple'
  loop
    insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
    values (
      p_wedding,
      vendor_user,
      'reminder',
      left(
        coalesce(studio, 'Votre prestataire') || ' vous demande ' ||
        case when added = 1 then '1 document.' else added::text || ' documents.' end,
        500
      ),
      couple
    );
  end loop;
  return added;
end;
$$;

create or replace function public.copy_requests_on_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vendor_profile uuid;
  linked record;
begin
  if new.member_role = 'couple' then
    for linked in
      select v.id as vendor_id
      from public.wedding_members m
      join public.vendor_profiles v on v.user_id = m.user_id
      where m.wedding_id = new.wedding_id and m.member_role = 'vendor'
    loop
      perform public.copy_vendor_document_requests(new.wedding_id, linked.vendor_id);
    end loop;
  elsif new.member_role = 'vendor' then
    select id into vendor_profile from public.vendor_profiles where user_id = new.user_id;
    if vendor_profile is not null then
      perform public.copy_vendor_document_requests(new.wedding_id, vendor_profile);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists wedding_members_copy_document_requests on public.wedding_members;
create trigger wedding_members_copy_document_requests
  after insert on public.wedding_members
  for each row execute function public.copy_requests_on_link();

create or replace function public.add_wedding_document_request(
  p_wedding uuid,
  p_title text,
  p_note text,
  p_required boolean,
  p_due date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  vendor uuid;
  studio text;
  request_id uuid;
  couple uuid;
  clean_title text := left(btrim(coalesce(p_title, '')), 120);
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  if char_length(clean_title) < 1 then
    raise exception 'Indiquez un intitulé';
  end if;
  select v.id, nullif(btrim(v.business_name), '')
    into vendor, studio
  from public.vendor_profiles v
  join public.wedding_members m on m.user_id = v.user_id and m.wedding_id = p_wedding and m.member_role = 'vendor'
  where v.user_id = uid;
  if vendor is null then
    raise exception 'Réservé au prestataire de ce mariage';
  end if;
  insert into public.wedding_document_requests (wedding_id, vendor_id, title, note, required, due_on, position)
  values (
    p_wedding,
    vendor,
    clean_title,
    left(btrim(coalesce(p_note, '')), 500),
    coalesce(p_required, true),
    p_due,
    coalesce((select max(position) + 1 from public.wedding_document_requests where wedding_id = p_wedding and vendor_id = vendor), 0)
  )
  returning id into request_id;
  for couple in
    select user_id from public.wedding_members where wedding_id = p_wedding and member_role = 'couple'
  loop
    insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
    values (
      p_wedding,
      uid,
      'reminder',
      left(coalesce(studio, 'Votre prestataire') || ' vous demande « ' || clean_title || ' ».', 500),
      couple
    );
  end loop;
  return request_id;
end;
$$;

create or replace function public.submit_document_request(p_id uuid, p_path text, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.wedding_document_requests%rowtype;
  vendor_user uuid;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select * into rec from public.wedding_document_requests where id = p_id;
  if rec.id is null then
    raise exception 'Demande introuvable';
  end if;
  if not public.is_wedding_couple(rec.wedding_id) then
    raise exception 'Réservé aux mariés';
  end if;
  if rec.status not in ('needed', 'correction') then
    raise exception 'Ce document est déjà envoyé';
  end if;
  if p_path is null or p_path not like rec.wedding_id::text || '/' || uid::text || '/%' then
    raise exception 'Fichier invalide';
  end if;
  update public.wedding_document_requests
    set status = 'sent',
        file_path = left(p_path, 500),
        file_name = left(btrim(coalesce(p_name, 'document')), 180),
        submitted_at = now(),
        correction_note = ''
    where id = rec.id;
  select user_id into vendor_user from public.vendor_profiles where id = rec.vendor_id;
  if vendor_user is not null then
    insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
    values (
      rec.wedding_id,
      uid,
      'reminder',
      left('Document reçu : ' || rec.title || '.', 500),
      vendor_user
    );
  end if;
end;
$$;

create or replace function public.review_document_request(p_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.wedding_document_requests%rowtype;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  if p_status not in ('validated', 'correction') then
    raise exception 'Réponse inconnue';
  end if;
  select * into rec from public.wedding_document_requests where id = p_id;
  if rec.id is null then
    raise exception 'Demande introuvable';
  end if;
  if not exists (
    select 1 from public.vendor_profiles v
    where v.id = rec.vendor_id and v.user_id = uid
  ) then
    raise exception 'Réservé au prestataire';
  end if;
  if rec.file_path is null or rec.status not in ('sent', 'correction') then
    raise exception 'Aucun fichier à relire';
  end if;
  if p_status = 'correction' and rec.status <> 'sent' then
    raise exception 'Le document n''est pas en attente de relecture';
  end if;
  update public.wedding_document_requests
    set status = p_status,
        correction_note = case when p_status = 'correction' then left(btrim(coalesce(p_note, '')), 500) else '' end,
        reviewed_at = now()
    where id = rec.id;
end;
$$;

revoke all on function public.copy_vendor_document_requests(uuid, uuid) from public, anon, authenticated;
revoke all on function public.copy_requests_on_link() from public, anon, authenticated;
revoke all on function public.add_wedding_document_request(uuid, text, text, boolean, date) from public, anon;
revoke all on function public.submit_document_request(uuid, text, text) from public, anon;
revoke all on function public.review_document_request(uuid, text, text) from public, anon;
grant execute on function public.add_wedding_document_request(uuid, text, text, boolean, date) to authenticated;
grant execute on function public.submit_document_request(uuid, text, text) to authenticated;
grant execute on function public.review_document_request(uuid, text, text) to authenticated;
