-- Session du 26/11. Compatible with the previous application:
-- accept_invitation(text) and merge_weddings(uuid, uuid) keep the same signature.
-- Issued invoice text stays immutable. Only a detached vendor or wedding key
-- may become null, and only while an account is being deleted.
-- Apply in the Supabase SQL editor. Do not edit an issued invoice's content.

create or replace function public.lock_issued_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  retain boolean := current_setting('vow.retain_invoices', true) = 'on';
  detach boolean := (new.vendor_id is null or new.vendor_id is not distinct from old.vendor_id)
    and (new.wedding_id is null or new.wedding_id is not distinct from old.wedding_id)
    and (new.vendor_id is distinct from old.vendor_id or new.wedding_id is distinct from old.wedding_id);
begin
  if new.vendor_id is distinct from old.vendor_id or new.wedding_id is distinct from old.wedding_id then
    if not (retain and detach) then
      raise exception 'Facture déjà émise';
    end if;
  end if;
  if new.number is distinct from old.number
     or new.amount_cents is distinct from old.amount_cents
     or new.title is distinct from old.title
     or new.seller_name is distinct from old.seller_name
     or new.seller_siret is distinct from old.seller_siret
     or new.seller_address is distinct from old.seller_address
     or new.client_name is distinct from old.client_name
     or new.vat_exempt is distinct from old.vat_exempt
     or new.payment_terms is distinct from old.payment_terms
     or new.due_on is distinct from old.due_on
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Facture déjà émise';
  end if;
  if new.status is distinct from old.status and new.status not in ('pending', 'paid') then
    raise exception 'Statut de facture invalide';
  end if;
  return new;
end;
$$;

alter table public.invoices alter column wedding_id drop not null;
alter table public.invoices alter column vendor_id drop not null;
alter table public.invoices drop constraint if exists invoices_wedding_id_fkey;
alter table public.invoices drop constraint if exists invoices_vendor_id_fkey;
alter table public.invoices
  add constraint invoices_wedding_id_fkey
  foreign key (wedding_id) references public.weddings (id) on delete set null;
alter table public.invoices
  add constraint invoices_vendor_id_fkey
  foreign key (vendor_id) references public.vendor_profiles (id) on delete set null;

alter table public.invoice_payments alter column wedding_id drop not null;
alter table public.invoice_payments alter column vendor_id drop not null;
alter table public.invoice_payments drop constraint if exists invoice_payments_wedding_id_fkey;
alter table public.invoice_payments drop constraint if exists invoice_payments_vendor_id_fkey;
alter table public.invoice_payments
  add constraint invoice_payments_wedding_id_fkey
  foreign key (wedding_id) references public.weddings (id) on delete set null;
alter table public.invoice_payments
  add constraint invoice_payments_vendor_id_fkey
  foreign key (vendor_id) references public.vendor_profiles (id) on delete set null;

create or replace function public.relocate_wedding_storage(p_keep uuid, p_drop uuid)
returns void
language plpgsql
security definer
set search_path = public, storage, extensions
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
    select id, bucket_id, name
    from storage.objects
    where bucket_id in ('wedding-documents', 'wedding-gallery')
      and name like p_drop::text || '/%'
  loop
    renamed := p_keep::text || substr(obj.name, prefix_len + 1);
    if exists (
      select 1 from storage.objects
      where bucket_id = obj.bucket_id and name = renamed and id <> obj.id
    ) then
      renamed := p_keep::text || '/' || gen_random_uuid()::text || substr(obj.name, prefix_len + 1);
    end if;
    update storage.objects set name = renamed where id = obj.id;
    update public.documents set storage_path = renamed where storage_path = obj.name;
    update public.vault_items set storage_path = renamed where storage_path = obj.name;
    update public.quote_intakes set storage_path = renamed where storage_path = obj.name;
    update public.delivery_files set storage_path = renamed where storage_path = obj.name;
  end loop;

  update public.documents
    set storage_path = p_keep::text || substr(storage_path, prefix_len + 1)
    where storage_path like p_drop::text || '/%';
  update public.vault_items
    set storage_path = p_keep::text || substr(storage_path, prefix_len + 1)
    where storage_path like p_drop::text || '/%';
  update public.quote_intakes
    set storage_path = p_keep::text || substr(storage_path, prefix_len + 1)
    where storage_path like p_drop::text || '/%';
  update public.delivery_files
    set storage_path = p_keep::text || substr(storage_path, prefix_len + 1)
    where storage_path like p_drop::text || '/%';
end;
$$;

revoke all on function public.relocate_wedding_storage(uuid, uuid) from public, anon, authenticated;

create or replace function public.merge_weddings(p_keep uuid, p_drop uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rel record;
  row record;
  drop_role public.app_role;
  keep_role public.app_role;
begin
  if p_keep is null or p_drop is null or p_keep = p_drop then
    return p_keep;
  end if;
  if not exists (select 1 from public.weddings where id = p_keep) then
    raise exception 'Mariage à conserver introuvable';
  end if;
  if not exists (select 1 from public.weddings where id = p_drop) then
    raise exception 'Mariage à fusionner introuvable';
  end if;
  if exists (select 1 from public.invoices where wedding_id = p_drop) then
    raise exception 'Facture déjà émise sur le mariage à fusionner. Conservez ce mariage : une facture émise ne peut pas changer.';
  end if;

  select p.role into drop_role
  from public.weddings w
  join public.profiles p on p.id = w.created_by
  where w.id = p_drop;
  select p.role into keep_role
  from public.weddings w
  join public.profiles p on p.id = w.created_by
  where w.id = p_keep;

  if drop_role = 'vendor' and keep_role is distinct from 'vendor' then
    update public.weddings keep
    set partner_one_name = drop_row.partner_one_name,
        partner_one_last_name = drop_row.partner_one_last_name,
        partner_two_name = drop_row.partner_two_name,
        partner_two_last_name = drop_row.partner_two_last_name,
        wedding_date = drop_row.wedding_date,
        venue_name = case when btrim(keep.venue_name) = '' then drop_row.venue_name else keep.venue_name end,
        venue_city = case when btrim(keep.venue_city) = '' then drop_row.venue_city else keep.venue_city end
    from public.weddings drop_row
    where keep.id = p_keep and drop_row.id = p_drop;
  end if;

  perform public.relocate_wedding_storage(p_keep, p_drop);

  insert into public.wedding_members (wedding_id, user_id, member_role)
  select p_keep, user_id, member_role
  from public.wedding_members
  where wedding_id = p_drop
  on conflict (wedding_id, user_id) do nothing;
  delete from public.wedding_members where wedding_id = p_drop;

  for rel in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'wedding_id'
      and a.attnum > 0
      and not a.attisdropped
      and c.relname <> 'wedding_members'
      and c.relname <> 'invoices'
      and c.relname <> 'invoice_payments'
  loop
    for row in execute format('select ctid from public.%I where wedding_id = $1', rel.relname) using p_drop
    loop
      begin
        execute format('update public.%I set wedding_id = $1 where ctid = $2', rel.relname)
          using p_keep, row.ctid;
      exception when unique_violation then
        execute format('delete from public.%I where ctid = $1', rel.relname) using row.ctid;
      end;
    end loop;
  end loop;

  delete from public.weddings where id = p_drop;
  return p_keep;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  invite public.invitations%rowtype;
  user_email text;
  account_role public.app_role;
  existing uuid;
  notice text;
  kept uuid;
  keep_has_invoice boolean;
  drop_has_invoice boolean;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  select * into invite from public.invitations where token = p_token;
  if not found then
    raise exception 'Invitation introuvable';
  end if;

  if invite.accepted_at is not null then
    if invite.accepted_by = uid then
      return invite.wedding_id;
    end if;
    raise exception 'Cette invitation a déjà été utilisée';
  end if;

  if invite.expires_at <= now() then
    raise exception 'Cette invitation a expiré';
  end if;

  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if user_email = '' or user_email <> lower(invite.email) then
    raise exception 'Cette invitation est destinée à une autre adresse e-mail';
  end if;

  select role into account_role from public.profiles where id = uid;
  if account_role is null then
    raise exception 'Profil introuvable';
  end if;
  if account_role is distinct from invite.invited_role then
    raise exception 'Cette invitation ne correspond pas à votre type de compte';
  end if;

  if invite.invited_role = 'couple' then
    select wm.wedding_id into existing
    from public.wedding_members wm
    where wm.user_id = uid
      and wm.member_role = 'couple'
      and wm.wedding_id <> invite.wedding_id
    limit 1;
    if existing is not null then
      keep_has_invoice := exists (select 1 from public.invoices where wedding_id = invite.wedding_id);
      drop_has_invoice := exists (select 1 from public.invoices where wedding_id = existing);
      if keep_has_invoice and drop_has_invoice then
        raise exception 'Les deux mariages ont déjà une facture émise. Une facture ne peut pas changer de mariage. Ouvrez le mariage du prestataire, celui qui porte la facture, et laissez l''autre de côté.';
      elsif drop_has_invoice and not keep_has_invoice then
        kept := public.merge_weddings(existing, invite.wedding_id);
      else
        kept := public.merge_weddings(invite.wedding_id, existing);
      end if;
      update public.invitations
      set accepted_at = now(),
          accepted_by = uid
      where id = invite.id
        and accepted_at is null;
      insert into public.wedding_notifications (wedding_id, author_id, kind, body)
      values (kept, uid, 'reminder', 'Le couple a rejoint le mariage.');
      return kept;
    end if;
  end if;

  insert into public.wedding_members (wedding_id, user_id, member_role)
  values (invite.wedding_id, uid, invite.invited_role)
  on conflict (wedding_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now(),
      accepted_by = uid
  where id = invite.id
    and accepted_at is null;

  notice := case
    when invite.invited_role = 'vendor' and invite.invitee_name <> '' then invite.invitee_name || ' a rejoint le mariage.'
    when invite.invited_role = 'vendor' then 'Le prestataire a rejoint le mariage.'
    else 'Le couple a rejoint le mariage.'
  end;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (invite.wedding_id, uid, 'reminder', notice);

  return invite.wedding_id;
end;
$$;

-- Repair files already left under a deleted wedding id.
do $$
declare
  rec record;
  prefix text;
  renamed text;
begin
  for rec in
    select id, wedding_id::text as wedding_id, storage_path, 'documents'::text as kind
    from public.documents
    where split_part(storage_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and split_part(storage_path, '/', 1) <> wedding_id::text
    union all
    select id, wedding_id::text, storage_path, 'vault'
    from public.vault_items
    where storage_path is not null
      and split_part(storage_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and split_part(storage_path, '/', 1) <> wedding_id::text
    union all
    select id, wedding_id::text, storage_path, 'quote'
    from public.quote_intakes
    where split_part(storage_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and split_part(storage_path, '/', 1) <> wedding_id::text
    union all
    select f.id, d.wedding_id::text, f.storage_path, 'gallery'
    from public.delivery_files f
    join public.deliveries d on d.id = f.delivery_id
    where split_part(f.storage_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and split_part(f.storage_path, '/', 1) <> d.wedding_id::text
  loop
    prefix := split_part(rec.storage_path, '/', 1);
    renamed := rec.wedding_id || substr(rec.storage_path, char_length(prefix) + 1);
    if exists (
      select 1 from storage.objects
      where name = renamed
        and bucket_id = case when rec.kind = 'gallery' then 'wedding-gallery' else 'wedding-documents' end
    ) then
      renamed := rec.wedding_id || '/' || gen_random_uuid()::text || substr(rec.storage_path, char_length(prefix) + 1);
    end if;
    update storage.objects
      set name = renamed
      where name = rec.storage_path
        and bucket_id = case when rec.kind = 'gallery' then 'wedding-gallery' else 'wedding-documents' end;
    if rec.kind = 'documents' then
      update public.documents set storage_path = renamed where id = rec.id;
    elsif rec.kind = 'vault' then
      update public.vault_items set storage_path = renamed where id = rec.id;
    elsif rec.kind = 'quote' then
      update public.quote_intakes set storage_path = renamed where id = rec.id;
    else
      update public.delivery_files set storage_path = renamed where id = rec.id;
    end if;
  end loop;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
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

  delete from storage.objects
  where bucket_id in ('wedding-documents', 'wedding-gallery', 'vendor-media')
    and (
      name like uid::text || '/%'
      or name like '%/' || uid::text || '/%'
    );

  delete from storage.objects o
  using public.documents d
  where d.uploaded_by = uid
    and o.bucket_id = 'wedding-documents'
    and o.name = d.storage_path;

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
