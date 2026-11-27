-- Uploads must not read storage_relocations. That table stays revoked.
-- A security definer function answers the policy instead.
-- create or replace, and drop policy if exists before create. Safe to run again.

create or replace function public.storage_relocation_allows(p_bucket text, p_name text, p_op text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.storage_relocations r
    where r.bucket_id = p_bucket
      and r.moved_at is null
      and public.storage_wedding_id(r.to_path) is not null
      and public.is_wedding_member(public.storage_wedding_id(r.to_path))
      and (
        (p_op = 'select' and (r.from_path = p_name or r.to_path = p_name))
        or (p_op = 'insert' and r.to_path = p_name)
        or (p_op = 'delete' and r.from_path = p_name)
      )
  );
$$;

revoke all on function public.storage_relocation_allows(text, text, text) from public, anon;
grant execute on function public.storage_relocation_allows(text, text, text) to authenticated;

drop policy if exists wedding_documents_relocate_select on storage.objects;
create policy wedding_documents_relocate_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-documents'
    and public.storage_relocation_allows(bucket_id, name, 'select')
  );

drop policy if exists wedding_documents_relocate_insert on storage.objects;
create policy wedding_documents_relocate_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wedding-documents'
    and public.storage_relocation_allows(bucket_id, name, 'insert')
  );

drop policy if exists wedding_documents_relocate_delete on storage.objects;
create policy wedding_documents_relocate_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wedding-documents'
    and public.storage_relocation_allows(bucket_id, name, 'delete')
  );

drop policy if exists wedding_gallery_relocate_select on storage.objects;
create policy wedding_gallery_relocate_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-gallery'
    and public.storage_relocation_allows(bucket_id, name, 'select')
  );

drop policy if exists wedding_gallery_relocate_insert on storage.objects;
create policy wedding_gallery_relocate_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wedding-gallery'
    and public.storage_relocation_allows(bucket_id, name, 'insert')
  );

drop policy if exists wedding_gallery_relocate_delete on storage.objects;
create policy wedding_gallery_relocate_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wedding-gallery'
    and public.storage_relocation_allows(bucket_id, name, 'delete')
  );

-- Records one move from the application tables. A failure while reading
-- storage.objects must not skip these rows: that is what left merges with
-- no storage_relocations.

create or replace function public.record_storage_relocation(
  p_bucket text,
  p_from text,
  p_keep uuid,
  p_drop uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  renamed text;
  prefix_len integer;
begin
  if p_from is null or btrim(p_from) = '' or p_keep is null or p_drop is null or p_keep = p_drop then
    return;
  end if;
  if p_from not like p_drop::text || '/%' then
    return;
  end if;
  prefix_len := char_length(p_drop::text);
  renamed := p_keep::text || substr(p_from, prefix_len + 1);
  if exists (
    select 1
    from public.storage_relocations taken
    where taken.bucket_id = p_bucket
      and taken.to_path = renamed
      and taken.from_path <> p_from
  ) then
    renamed := p_keep::text || '/' || gen_random_uuid()::text || substr(p_from, prefix_len + 1);
  end if;

  insert into public.storage_relocations (bucket_id, from_path, to_path)
  values (p_bucket, p_from, renamed)
  on conflict (bucket_id, from_path) do nothing;

  select rel.to_path into renamed
  from public.storage_relocations rel
  where rel.bucket_id = p_bucket
    and rel.from_path = p_from;

  if renamed is null then
    return;
  end if;

  update public.documents set storage_path = renamed where storage_path = p_from;
  update public.vault_items set storage_path = renamed where storage_path = p_from;
  update public.quote_intakes set storage_path = renamed where storage_path = p_from;
  update public.delivery_files set storage_path = renamed where storage_path = p_from;
end;
$$;

revoke all on function public.record_storage_relocation(text, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.relocate_wedding_storage(p_keep uuid, p_drop uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  prefix text;
begin
  if p_keep is null or p_drop is null or p_keep = p_drop then
    return;
  end if;
  prefix := p_drop::text || '/';

  for rec in
    select bucket_id, path
    from (
      select 'wedding-documents'::text as bucket_id, d.storage_path as path
      from public.documents d
      where d.storage_path like prefix || '%'
      union
      select 'wedding-documents'::text, v.storage_path
      from public.vault_items v
      where v.storage_path like prefix || '%'
      union
      select 'wedding-documents'::text, q.storage_path
      from public.quote_intakes q
      where q.storage_path like prefix || '%'
      union
      select 'wedding-gallery'::text, f.storage_path
      from public.delivery_files f
      where f.storage_path like prefix || '%'
    ) found
  loop
    perform public.record_storage_relocation(rec.bucket_id, rec.path, p_keep, p_drop);
  end loop;

  begin
    for rec in
      select o.bucket_id, o.name as path
      from storage.objects o
      where o.bucket_id in ('wedding-documents', 'wedding-gallery')
        and o.name like prefix || '%'
    loop
      perform public.record_storage_relocation(rec.bucket_id, rec.path, p_keep, p_drop);
    end loop;
  exception
    when others then
      null;
  end;
end;
$$;

revoke all on function public.relocate_wedding_storage(uuid, uuid) from public, anon, authenticated;
