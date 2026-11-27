-- The vendor vault list failed closed: selecting a file also checked shares,
-- and the share policy selected files again. Postgres reported infinite recursion,
-- the page ignored the error, and the coffre looked empty after a successful insert.
-- Ownership is read here without re-entering those policies.

create or replace function public.owns_vault_file(p_file uuid)
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
    where f.id = p_file
      and v.user_id = auth.uid()
  );
$$;

revoke all on function public.owns_vault_file(uuid) from public, anon;
grant execute on function public.owns_vault_file(uuid) to authenticated;

drop policy if exists vendor_vault_shares_select on public.vendor_vault_shares;
create policy vendor_vault_shares_select on public.vendor_vault_shares
  for select to authenticated
  using (
    public.owns_vault_file(file_id)
    or (
      public.is_wedding_member(wedding_id)
      and (
        recipient_user_id = auth.uid()
        or (recipient_user_id is null and public.is_wedding_couple(wedding_id))
      )
    )
  );

drop policy if exists vendor_vault_versions_owner on public.vendor_vault_versions;
create policy vendor_vault_versions_owner on public.vendor_vault_versions
  for select to authenticated
  using (public.owns_vault_file(file_id));

-- A merge used to rename storage.objects.name. That updates the index only.
-- The bytes stay on the old key, and the download then returns NoSuchKey.
-- This table records the old key and the new one. The server moves the bytes
-- with the Storage API, then marks the row. Running it again inserts nothing.

create table if not exists public.storage_relocations (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  from_path text not null,
  to_path text not null,
  created_at timestamptz not null default now(),
  moved_at timestamptz,
  missing_at timestamptz,
  constraint storage_relocations_from unique (bucket_id, from_path)
);

alter table public.storage_relocations enable row level security;
revoke all on table public.storage_relocations from public, anon, authenticated;

create or replace function public.relocate_wedding_storage(p_keep uuid, p_drop uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  obj record;
  renamed text;
  prefix_len integer;
begin
  if p_keep is null or p_drop is null or p_keep = p_drop then
    return;
  end if;
  prefix_len := char_length(p_drop::text);

  for obj in
    select bucket_id, name
    from (
      select o.bucket_id, o.name
      from storage.objects o
      where o.bucket_id in ('wedding-documents', 'wedding-gallery')
        and o.name like p_drop::text || '/%'
      union
      select 'wedding-documents', d.storage_path
      from public.documents d
      where d.storage_path like p_drop::text || '/%'
      union
      select 'wedding-documents', v.storage_path
      from public.vault_items v
      where v.storage_path like p_drop::text || '/%'
      union
      select 'wedding-documents', q.storage_path
      from public.quote_intakes q
      where q.storage_path like p_drop::text || '/%'
      union
      select 'wedding-gallery', f.storage_path
      from public.delivery_files f
      where f.storage_path like p_drop::text || '/%'
    ) found
  loop
    renamed := p_keep::text || substr(obj.name, prefix_len + 1);
    if exists (
      select 1 from storage.objects existing
      where existing.bucket_id = obj.bucket_id and existing.name = renamed
    ) or exists (
      select 1 from public.storage_relocations taken
      where taken.bucket_id = obj.bucket_id and taken.to_path = renamed and taken.from_path <> obj.name
    ) then
      renamed := p_keep::text || '/' || gen_random_uuid()::text || substr(obj.name, prefix_len + 1);
    end if;

    insert into public.storage_relocations (bucket_id, from_path, to_path)
    values (obj.bucket_id, obj.name, renamed)
    on conflict (bucket_id, from_path) do nothing;

    select rel.to_path into renamed
    from public.storage_relocations rel
    where rel.bucket_id = obj.bucket_id and rel.from_path = obj.name;

    update public.documents set storage_path = renamed where storage_path = obj.name;
    update public.vault_items set storage_path = renamed where storage_path = obj.name;
    update public.quote_intakes set storage_path = renamed where storage_path = obj.name;
    update public.delivery_files set storage_path = renamed where storage_path = obj.name;
  end loop;
end;
$$;

revoke all on function public.relocate_wedding_storage(uuid, uuid) from public, anon, authenticated;

create or replace function public.pending_storage_relocations()
returns table (id uuid, bucket_id text, from_path text, to_path text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.bucket_id, r.from_path, r.to_path
  from public.storage_relocations r
  where r.moved_at is null
    and r.missing_at is null
    and public.storage_wedding_id(r.to_path) is not null
    and public.is_wedding_member(public.storage_wedding_id(r.to_path));
$$;

create or replace function public.finish_storage_relocation(p_id uuid, p_missing boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.storage_relocations r
  set moved_at = case when p_missing then r.moved_at else now() end,
      missing_at = case when p_missing then coalesce(r.missing_at, now()) else r.missing_at end
  where r.id = p_id
    and public.storage_wedding_id(r.to_path) is not null
    and public.is_wedding_member(public.storage_wedding_id(r.to_path));
end;
$$;

revoke all on function public.pending_storage_relocations() from public, anon;
revoke all on function public.finish_storage_relocation(uuid, boolean) from public, anon;
grant execute on function public.pending_storage_relocations() to authenticated;
grant execute on function public.finish_storage_relocation(uuid, boolean) to authenticated;

-- Production recorded this migration as 20261127070957, then dropped the six
-- *_relocate_* policies. They read storage_relocations directly, and that table
-- is revoked from authenticated, so every upload failed with
-- "permission denied for table storage_relocations". Those policies are not
-- part of the live database. Their replacement is
-- 20261127160000_storage_relocation_access.sql.

-- preview_invitation gains invitee_name. Older clients ignore the extra key.
create or replace function public.preview_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invitations%rowtype;
  wedding public.weddings%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into invite from public.invitations where token = p_token;
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  if invite.accepted_at is not null then
    return jsonb_build_object(
      'status', 'accepted',
      'wedding_id', invite.wedding_id,
      'role', invite.invited_role
    );
  end if;

  if invite.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select * into wedding from public.weddings where id = invite.wedding_id;

  return jsonb_build_object(
    'status', 'pending',
    'email', invite.email,
    'role', invite.invited_role,
    'wedding_id', invite.wedding_id,
    'partner_one', wedding.partner_one_name,
    'partner_one_last', wedding.partner_one_last_name,
    'partner_two', wedding.partner_two_name,
    'partner_two_last', wedding.partner_two_last_name,
    'wedding_date', wedding.wedding_date,
    'venue_name', wedding.venue_name,
    'venue_city', wedding.venue_city,
    'invitee_trade', invite.invitee_trade,
    'invitee_name', invite.invitee_name
  );
end;
$$;
