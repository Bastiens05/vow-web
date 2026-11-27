-- Follow-up to 20261126213739_session_fixes.sql. Do not edit that file.
-- create or replace only. Safe to run again on a database that already has 20261126213739_session_fixes.
-- The application on main still calls accept_invitation(text), merge_weddings(uuid, uuid)
-- and preview_invitation(text). The extra invitee_trade key is ignored by older clients.

create or replace function public.lock_issued_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  retain boolean := current_setting('vow.retain_invoices', true) = 'on';
  merging boolean := current_setting('vow.merge_weddings', true) = 'on';
  detach boolean := (new.vendor_id is null or new.vendor_id is not distinct from old.vendor_id)
    and (new.wedding_id is null or new.wedding_id is not distinct from old.wedding_id)
    and (new.vendor_id is distinct from old.vendor_id or new.wedding_id is distinct from old.wedding_id);
  moved boolean := merging
    and new.wedding_id is not null
    and new.wedding_id is distinct from old.wedding_id
    and new.vendor_id is not distinct from old.vendor_id;
begin
  if new.vendor_id is distinct from old.vendor_id or new.wedding_id is distinct from old.wedding_id then
    if not ((retain and detach) or moved) then
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

  perform set_config('vow.merge_weddings', 'on', true);

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
        venue_name = case when btrim(drop_row.venue_name) <> '' then drop_row.venue_name else keep.venue_name end,
        venue_city = case when btrim(drop_row.venue_city) <> '' then drop_row.venue_city else keep.venue_city end
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
  vendor_wedding public.weddings%rowtype;
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

  if invite.invited_role = 'vendor'
     and invite.invitee_trade in ('photographer', 'videographer', 'dj', 'florist', 'caterer', 'venue', 'planner', 'beauty', 'officiant', 'other') then
    update public.vendor_profiles
    set category = invite.invitee_trade::public.vendor_category
    where user_id = uid
      and category = 'other';
  end if;

  if invite.invited_role = 'couple' then
    select wm.wedding_id into existing
    from public.wedding_members wm
    where wm.user_id = uid
      and wm.member_role = 'couple'
      and wm.wedding_id <> invite.wedding_id
    limit 1;
    if existing is not null then
      select * into vendor_wedding from public.weddings where id = invite.wedding_id;
      keep_has_invoice := exists (select 1 from public.invoices where wedding_id = invite.wedding_id);
      drop_has_invoice := exists (select 1 from public.invoices where wedding_id = existing);
      if drop_has_invoice and not keep_has_invoice then
        kept := public.merge_weddings(existing, invite.wedding_id);
      else
        kept := public.merge_weddings(invite.wedding_id, existing);
      end if;
      update public.weddings
      set partner_one_name = vendor_wedding.partner_one_name,
          partner_one_last_name = vendor_wedding.partner_one_last_name,
          partner_two_name = vendor_wedding.partner_two_name,
          partner_two_last_name = vendor_wedding.partner_two_last_name,
          wedding_date = vendor_wedding.wedding_date,
          venue_name = case when btrim(vendor_wedding.venue_name) <> '' then vendor_wedding.venue_name else venue_name end,
          venue_city = case when btrim(vendor_wedding.venue_city) <> '' then vendor_wedding.venue_city else venue_city end
      where id = kept;
      update public.invitations
      set accepted_at = now(),
          accepted_by = uid
      where id = invite.id
        and accepted_at is null;
      insert into public.notification_reads (notification_id, user_id)
      select n.id, uid
      from public.wedding_notifications n
      where n.wedding_id = kept
      on conflict (notification_id, user_id) do nothing;
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
    when invite.invited_role = 'vendor' and btrim(coalesce(invite.invitee_name, '')) <> '' then btrim(invite.invitee_name) || ' a rejoint le mariage.'
    when invite.invited_role = 'vendor' then 'Le prestataire a rejoint le mariage.'
    else 'Le couple a rejoint le mariage.'
  end;

  insert into public.notification_reads (notification_id, user_id)
  select n.id, uid
  from public.wedding_notifications n
  where n.wedding_id = invite.wedding_id
  on conflict (notification_id, user_id) do nothing;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (invite.wedding_id, uid, 'reminder', notice);

  return invite.wedding_id;
end;
$$;

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
    'invitee_trade', invite.invitee_trade
  );
end;
$$;
