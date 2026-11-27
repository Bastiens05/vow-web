-- Coffre-fort du prestataire : des pièces déposées une fois, puis partagées sur un mariage.
-- Le fichier reste privé. Un membre du mariage ne le voit que s'il en est destinataire.

create table public.vendor_vault_files (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  title text not null,
  category text not null default 'other',
  storage_path text not null,
  file_name text not null,
  mime_type text not null default '',
  expires_on date,
  alert_days integer not null default 30,
  auto_share boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_vault_files_title check (char_length(btrim(title)) between 1 and 120),
  constraint vendor_vault_files_category check (category in ('rc_pro', 'kbis', 'tech', 'cgv', 'other')),
  constraint vendor_vault_files_alert check (alert_days between 1 and 180),
  constraint vendor_vault_files_name check (char_length(file_name) between 1 and 180)
);

create table public.vendor_vault_versions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.vendor_vault_files (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table public.vendor_vault_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.vendor_vault_files (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  recipient_user_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index vendor_vault_shares_couple_once
  on public.vendor_vault_shares (file_id, wedding_id)
  where recipient_user_id is null;

create unique index vendor_vault_shares_user_once
  on public.vendor_vault_shares (file_id, wedding_id, recipient_user_id)
  where recipient_user_id is not null;

create index vendor_vault_shares_wedding_idx on public.vendor_vault_shares (wedding_id);

alter table public.vendor_vault_files enable row level security;
alter table public.vendor_vault_versions enable row level security;
alter table public.vendor_vault_shares enable row level security;

revoke all on table public.vendor_vault_files from public, anon;
revoke all on table public.vendor_vault_versions from public, anon;
revoke all on table public.vendor_vault_shares from public, anon;
grant select, insert, update, delete on table public.vendor_vault_files to authenticated;
grant select on table public.vendor_vault_versions to authenticated;
grant select on table public.vendor_vault_shares to authenticated;

create policy vendor_vault_files_shared on public.vendor_vault_files
  for select to authenticated
  using (
    exists (
      select 1 from public.vendor_vault_shares s
      where s.file_id = vendor_vault_files.id
        and public.is_wedding_member(s.wedding_id)
        and (
          s.recipient_user_id = auth.uid()
          or (s.recipient_user_id is null and public.is_wedding_couple(s.wedding_id))
        )
    )
  );

create policy vendor_vault_files_owner on public.vendor_vault_files
  for all to authenticated
  using (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()))
  with check (vendor_id in (select id from public.vendor_profiles where user_id = auth.uid()));

create policy vendor_vault_versions_owner on public.vendor_vault_versions
  for select to authenticated
  using (
    file_id in (
      select f.id from public.vendor_vault_files f
      join public.vendor_profiles v on v.id = f.vendor_id
      where v.user_id = auth.uid()
    )
  );

create policy vendor_vault_shares_select on public.vendor_vault_shares
  for select to authenticated
  using (
    file_id in (
      select f.id from public.vendor_vault_files f
      join public.vendor_profiles v on v.id = f.vendor_id
      where v.user_id = auth.uid()
    )
    or (
      public.is_wedding_member(wedding_id)
      and (
        recipient_user_id = auth.uid()
        or (recipient_user_id is null and public.is_wedding_couple(wedding_id))
      )
    )
  );

create or replace function public.can_read_vendor_vault_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_vault_files f
    join public.vendor_profiles v on v.id = f.vendor_id
    where f.storage_path = p_name and v.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.vendor_vault_files f
    join public.vendor_vault_shares s on s.file_id = f.id
    where f.storage_path = p_name
      and public.is_wedding_member(s.wedding_id)
      and (
        s.recipient_user_id = auth.uid()
        or (s.recipient_user_id is null and public.is_wedding_couple(s.wedding_id))
      )
  );
$$;

revoke all on function public.can_read_vendor_vault_object(text) from public, anon;
grant execute on function public.can_read_vendor_vault_object(text) to authenticated;

create policy vendor_vault_objects_owner on storage.objects
  for all to authenticated
  using (
    bucket_id = 'wedding-documents'
    and (storage.foldername(name))[1] = 'coffre'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'wedding-documents'
    and (storage.foldername(name))[1] = 'coffre'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy vendor_vault_objects_shared on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-documents'
    and (storage.foldername(name))[1] = 'coffre'
    and public.can_read_vendor_vault_object(name)
  );

create or replace function public.replace_vendor_vault_file(p_id uuid, p_path text, p_name text, p_mime text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.vendor_vault_files%rowtype;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select f.* into rec
  from public.vendor_vault_files f
  join public.vendor_profiles v on v.id = f.vendor_id
  where f.id = p_id and v.user_id = uid;
  if rec.id is null then
    raise exception 'Document introuvable';
  end if;
  if p_path is null or p_path not like 'coffre/' || uid::text || '/%' then
    raise exception 'Fichier invalide';
  end if;
  insert into public.vendor_vault_versions (file_id, storage_path, file_name)
  values (rec.id, rec.storage_path, rec.file_name);
  update public.vendor_vault_files
    set storage_path = left(p_path, 500),
        file_name = left(btrim(coalesce(p_name, 'document')), 180),
        mime_type = left(coalesce(p_mime, ''), 120),
        updated_at = now()
    where id = rec.id;
end;
$$;

create or replace function public.share_vendor_vault(
  p_file uuid,
  p_wedding uuid,
  p_couple boolean,
  p_users uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.vendor_vault_files%rowtype;
  studio text;
  person uuid;
  inserted uuid;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  if not public.is_wedding_member(p_wedding) then
    raise exception 'Vous n''êtes pas sur ce mariage';
  end if;
  select f.* into rec
  from public.vendor_vault_files f
  join public.vendor_profiles v on v.id = f.vendor_id
  where f.id = p_file and v.user_id = uid;
  select nullif(btrim(business_name), '') into studio
  from public.vendor_profiles where user_id = uid;
  if rec.id is null then
    raise exception 'Document introuvable';
  end if;

  if p_couple then
    insert into public.vendor_vault_shares (file_id, wedding_id, recipient_user_id)
    values (rec.id, p_wedding, null)
    on conflict (file_id, wedding_id) where recipient_user_id is null do nothing
    returning id into inserted;
    if inserted is not null then
      for person in
        select user_id from public.wedding_members
        where wedding_id = p_wedding and member_role = 'couple'
      loop
        insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
        values (
          p_wedding,
          uid,
          'reminder',
          left(coalesce(studio, 'Un prestataire') || ' a partagé ' || rec.title || '.', 500),
          person
        );
      end loop;
    end if;
  end if;

  foreach person in array coalesce(p_users, '{}'::uuid[])
  loop
    if person = uid then
      continue;
    end if;
    if not exists (
      select 1 from public.wedding_members
      where wedding_id = p_wedding and user_id = person and member_role = 'vendor'
    ) then
      continue;
    end if;
    insert into public.vendor_vault_shares (file_id, wedding_id, recipient_user_id)
    values (rec.id, p_wedding, person)
    on conflict (file_id, wedding_id, recipient_user_id) where recipient_user_id is not null do nothing
    returning id into inserted;
    if inserted is not null then
      insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
      values (
        p_wedding,
        uid,
        'reminder',
        left(coalesce(studio, 'Un prestataire') || ' a partagé ' || rec.title || '.', 500),
        person
      );
    end if;
  end loop;
end;
$$;

create or replace function public.share_auto_vault(p_wedding uuid, p_vendor_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  studio text;
  person uuid;
  inserted uuid;
begin
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and member_role = 'couple'
  ) then
    return;
  end if;
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and user_id = p_vendor_user and member_role = 'vendor'
  ) then
    return;
  end if;
  select nullif(btrim(business_name), '') into studio
  from public.vendor_profiles where user_id = p_vendor_user;

  for rec in
    select f.id, f.title
    from public.vendor_vault_files f
    join public.vendor_profiles v on v.id = f.vendor_id
    where v.user_id = p_vendor_user and f.auto_share
  loop
    insert into public.vendor_vault_shares (file_id, wedding_id, recipient_user_id)
    values (rec.id, p_wedding, null)
    on conflict (file_id, wedding_id) where recipient_user_id is null do nothing
    returning id into inserted;
    if inserted is null then
      continue;
    end if;
    for person in
      select user_id from public.wedding_members
      where wedding_id = p_wedding and member_role = 'couple'
    loop
      insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
      values (
        p_wedding,
        p_vendor_user,
        'reminder',
        left(coalesce(studio, 'Un prestataire') || ' a partagé ' || rec.title || '.', 500),
        person
      );
    end loop;
  end loop;
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
      select v.id as vendor_id, v.user_id
      from public.wedding_members m
      join public.vendor_profiles v on v.user_id = m.user_id
      where m.wedding_id = new.wedding_id and m.member_role = 'vendor'
    loop
      perform public.copy_vendor_document_requests(new.wedding_id, linked.vendor_id);
      perform public.share_auto_vault(new.wedding_id, linked.user_id);
    end loop;
  elsif new.member_role = 'vendor' then
    select id into vendor_profile from public.vendor_profiles where user_id = new.user_id;
    if vendor_profile is not null then
      perform public.copy_vendor_document_requests(new.wedding_id, vendor_profile);
    end if;
    perform public.share_auto_vault(new.wedding_id, new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.replace_vendor_vault_file(uuid, text, text, text) from public, anon;
revoke all on function public.share_vendor_vault(uuid, uuid, boolean, uuid[]) from public, anon;
revoke all on function public.share_auto_vault(uuid, uuid) from public, anon, authenticated;
grant execute on function public.replace_vendor_vault_file(uuid, text, text, text) to authenticated;
grant execute on function public.share_vendor_vault(uuid, uuid, boolean, uuid[]) to authenticated;
