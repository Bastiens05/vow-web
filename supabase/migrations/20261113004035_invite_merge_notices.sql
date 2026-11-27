-- In-app invitations, wedding merge, and named message notices.

alter table public.wedding_notifications drop constraint if exists wedding_notifications_kind;
alter table public.wedding_notifications
  add constraint wedding_notifications_kind
  check (kind in ('shift', 'alert', 'reminder', 'message'));

create or replace function public.messages_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender text;
begin
  select nullif(btrim(full_name), '') into sender
  from public.profiles
  where id = new.author_id;
  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (
    new.wedding_id,
    new.author_id,
    'message',
    left(coalesce(sender, 'Quelqu''un') || ' : ' || btrim(new.body), 180)
  );
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

revoke all on function public.merge_weddings(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_weddings(uuid, uuid) to service_role;

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
      kept := public.merge_weddings(existing, invite.wedding_id);
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

create or replace function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  invite public.invitations%rowtype;
  user_email text;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select * into invite from public.invitations where token = p_token;
  if not found or invite.accepted_at is not null then
    return;
  end if;
  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if user_email = '' or user_email <> lower(invite.email) then
    raise exception 'Cette invitation est destinée à une autre adresse e-mail';
  end if;
  delete from public.invitations where id = invite.id and accepted_at is null;
end;
$$;

revoke all on function public.decline_invitation(text) from public, anon;
grant execute on function public.decline_invitation(text) to authenticated;

create or replace function public.my_pending_invitations()
returns table (token text, invited_role public.app_role, title text)
language sql
stable
security definer
set search_path = public
as $$
  select i.token,
         i.invited_role,
         w.partner_one_name || ' & ' || w.partner_two_name
  from public.invitations i
  join public.weddings w on w.id = i.wedding_id
  where i.accepted_at is null
    and i.expires_at > now()
    and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke all on function public.my_pending_invitations() from public, anon;
grant execute on function public.my_pending_invitations() to authenticated;

create or replace function public.wedding_directory(p_wedding_id uuid)
returns table (
  user_id uuid,
  member_role text,
  full_name text,
  business_name text,
  category text,
  phone text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.user_id,
    m.member_role::text,
    p.full_name,
    v.business_name,
    v.category::text,
    case
      when coalesce(v.share_phone, false) and btrim(coalesce(v.contact_phone, '')) <> '' then v.contact_phone
      else null
    end,
    case
      when public.is_wedding_couple(p_wedding_id) then coalesce(nullif(btrim(v.contact_email), ''), nullif(btrim(p.email), ''))
      when coalesce(v.share_email, false) and btrim(coalesce(v.contact_email, '')) <> '' then v.contact_email
      else null
    end
  from public.wedding_members m
  join public.profiles p on p.id = m.user_id
  left join public.vendor_profiles v on v.user_id = m.user_id and m.member_role = 'vendor'
  where m.wedding_id = p_wedding_id
    and (public.is_wedding_member(p_wedding_id) or public.is_wedding_staff(p_wedding_id));
$$;
