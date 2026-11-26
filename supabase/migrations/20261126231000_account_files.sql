-- Account deletion no longer writes storage.objects.
-- delete_my_account() keeps issued invoices and only removes database rows.
-- my_account_files() lists the objects the app must remove through the Storage API first.
-- Compatible with the application already in production: the old delete_my_account()
-- signature stays (returns void). The listing function is new.

create or replace function public.my_account_files()
returns table (bucket text, path text)
language sql
stable
security definer
set search_path = public
as $$
  select 'wedding-documents'::text, d.storage_path
  from public.documents d
  where d.uploaded_by = auth.uid()
    and btrim(d.storage_path) <> ''
  union
  select 'wedding-documents'::text, v.storage_path
  from public.vault_items v
  where v.owner_id = auth.uid()
    and v.storage_path is not null
    and btrim(v.storage_path) <> ''
  union
  select 'wedding-documents'::text, f.storage_path
  from public.vendor_vault_files f
  join public.vendor_profiles p on p.id = f.vendor_id
  where p.user_id = auth.uid()
    and btrim(f.storage_path) <> ''
  union
  select 'wedding-documents'::text, ver.storage_path
  from public.vendor_vault_versions ver
  join public.vendor_vault_files f on f.id = ver.file_id
  join public.vendor_profiles p on p.id = f.vendor_id
  where p.user_id = auth.uid()
    and btrim(ver.storage_path) <> ''
  union
  select 'wedding-documents'::text, q.storage_path
  from public.quote_intakes q
  where split_part(q.storage_path, '/', 2) = auth.uid()::text
    and btrim(q.storage_path) <> ''
  union
  select 'vendor-media'::text, photo.storage_path
  from public.vendor_photos photo
  join public.vendor_profiles p on p.id = photo.vendor_id
  where p.user_id = auth.uid()
    and btrim(photo.storage_path) <> ''
  union
  select 'vendor-media'::text, p.logo_path
  from public.vendor_profiles p
  where p.user_id = auth.uid()
    and p.logo_path is not null
    and btrim(p.logo_path) <> ''
  union
  select 'wedding-gallery'::text, file.storage_path
  from public.delivery_files file
  where split_part(file.storage_path, '/', 2) = auth.uid()::text
    and btrim(file.storage_path) <> ''
$$;

revoke all on function public.my_account_files() from public, anon;
grant execute on function public.my_account_files() to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  wid uuid;
  replacement uuid;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  perform set_config('vow.retain_invoices', 'on', true);

  for wid in select id from public.weddings where created_by = uid
  loop
    select user_id into replacement
    from public.wedding_members
    where wedding_id = wid and user_id <> uid
    order by case when member_role = 'couple' then 0 else 1 end, created_at
    limit 1;
    if replacement is not null then
      update public.weddings set created_by = replacement where id = wid;
    else
      delete from public.weddings where id = wid;
    end if;
    replacement := null;
  end loop;

  update public.timeline_slots slot
  set created_by = (
    select member.user_id
    from public.wedding_members member
    where member.wedding_id = slot.wedding_id and member.user_id <> uid
    limit 1
  )
  where slot.created_by = uid
    and exists (
      select 1 from public.wedding_members member
      where member.wedding_id = slot.wedding_id and member.user_id <> uid
    );
  delete from public.timeline_slots where created_by = uid;

  update public.signature_requests request
  set requested_by = (
    select member.user_id
    from public.wedding_members member
    where member.wedding_id = request.wedding_id and member.user_id <> uid
    limit 1
  )
  where request.requested_by = uid
    and exists (
      select 1 from public.wedding_members member
      where member.wedding_id = request.wedding_id and member.user_id <> uid
    );
  delete from public.signature_requests where requested_by = uid;

  delete from public.invitations where invited_by = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
