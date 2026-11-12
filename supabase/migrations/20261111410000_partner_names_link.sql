-- Prénoms et noms, et le lien mariés ↔ prestataire.
-- Les noms de famille restent vides pour les mariages déjà créés.

alter table public.weddings
  add column partner_one_last_name text,
  add column partner_two_last_name text;

alter table public.weddings
  add constraint weddings_last_name_len check (
    (partner_one_last_name is null or char_length(btrim(partner_one_last_name)) between 2 and 80)
    and (partner_two_last_name is null or char_length(btrim(partner_two_last_name)) between 2 and 80)
  );

alter table public.invitations
  add column invitee_name text not null default '',
  add column invitee_trade text not null default '';

alter table public.invitations
  add constraint invitations_invitee_len check (
    char_length(invitee_name) <= 120
    and char_length(invitee_trade) <= 40
  );

drop policy if exists invitations_couple_select on public.invitations;
create policy invitations_couple_select on public.invitations
  for select to authenticated
  using (
    public.is_wedding_couple(wedding_id)
    and (invited_role = 'couple' or invited_by = auth.uid())
  );

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete to authenticated
  using (
    accepted_at is null
    and (
      public.is_wedding_vendor(wedding_id)
      or invited_by = auth.uid()
    )
  );

create or replace function public.blank_last_name(p_value text)
returns text
language plpgsql
immutable
as $$
declare
  clean text := nullif(btrim(coalesce(p_value, '')), '');
begin
  if clean is null then
    return null;
  end if;
  if char_length(clean) < 2 or char_length(clean) > 80 then
    raise exception 'Indiquez un nom (2 à 80 caractères)';
  end if;
  return clean;
end;
$$;

drop function if exists public.create_couple_wedding(text, text, date, text);

create function public.create_couple_wedding(
  p_partner_one text,
  p_partner_two text,
  p_wedding_date date,
  p_city text,
  p_partner_one_last text default null,
  p_partner_two_last text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  account_role public.app_role;
  wid uuid;
  one_last text;
  two_last text;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select role into account_role from public.profiles where id = uid;
  if account_role is distinct from 'couple' then
    raise exception 'Réservé aux mariés';
  end if;
  if char_length(btrim(coalesce(p_partner_one, ''))) < 2
    or char_length(btrim(coalesce(p_partner_two, ''))) < 2 then
    raise exception 'Indiquez les deux prénoms';
  end if;
  if p_wedding_date is null then
    raise exception 'Indiquez la date du mariage';
  end if;
  one_last := public.blank_last_name(p_partner_one_last);
  two_last := public.blank_last_name(p_partner_two_last);

  select wedding_id into wid
  from public.wedding_members
  where user_id = uid and member_role = 'couple'
  limit 1;
  if wid is not null then
    return wid;
  end if;

  insert into public.weddings (
    created_by, partner_one_name, partner_one_last_name, partner_two_name, partner_two_last_name,
    wedding_date, venue_name, venue_city
  )
  values (
    uid,
    btrim(p_partner_one),
    one_last,
    btrim(p_partner_two),
    two_last,
    p_wedding_date,
    '',
    left(btrim(coalesce(p_city, '')), 120)
  )
  returning id into wid;

  insert into public.wedding_members (wedding_id, user_id, member_role)
  values (wid, uid, 'couple');
  return wid;
end;
$$;

drop function if exists public.create_wedding(text, text, date, text, text);

create function public.create_wedding(
  p_partner_one text,
  p_partner_two text,
  p_wedding_date date,
  p_venue_name text,
  p_venue_city text,
  p_partner_one_last text default null,
  p_partner_two_last text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  account_role public.app_role;
  wid uuid;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  select role into account_role from public.profiles where id = uid;
  if account_role is distinct from 'vendor' then
    raise exception 'Seuls les prestataires peuvent créer un mariage';
  end if;

  if char_length(btrim(coalesce(p_partner_one, ''))) < 2
    or char_length(btrim(coalesce(p_partner_two, ''))) < 2 then
    raise exception 'Indiquez les deux prénoms';
  end if;

  if p_wedding_date is null then
    raise exception 'Indiquez la date du mariage';
  end if;

  insert into public.weddings (
    created_by,
    partner_one_name,
    partner_one_last_name,
    partner_two_name,
    partner_two_last_name,
    wedding_date,
    venue_name,
    venue_city
  )
  values (
    uid,
    btrim(p_partner_one),
    public.blank_last_name(p_partner_one_last),
    btrim(p_partner_two),
    public.blank_last_name(p_partner_two_last),
    p_wedding_date,
    btrim(coalesce(p_venue_name, '')),
    btrim(coalesce(p_venue_city, ''))
  )
  returning id into wid;

  insert into public.wedding_members (wedding_id, user_id, member_role)
  values (wid, uid, 'vendor');

  return wid;
end;
$$;

drop function if exists public.create_invitation(uuid, text, public.app_role, text);

create function public.create_invitation(
  p_wedding_id uuid,
  p_email text,
  p_role public.app_role,
  p_token text,
  p_invitee_name text default '',
  p_invitee_trade text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text;
  new_id uuid;
  couple_host boolean;
  display_name text;
  trade text;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  couple_host := public.is_wedding_couple(p_wedding_id);
  if public.is_wedding_vendor(p_wedding_id) then
    null;
  elsif couple_host and p_role = 'vendor' then
    null;
  elsif couple_host and p_role = 'couple' then
    null;
  else
    raise exception 'Invitation non autorisée';
  end if;

  if p_role not in ('vendor', 'couple') then
    raise exception 'Rôle d''invitation invalide';
  end if;

  if p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Jeton d''invitation invalide';
  end if;

  normalized := lower(btrim(coalesce(p_email, '')));
  if normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;

  if exists (
    select 1 from public.profiles
    where id = uid and lower(email) = normalized
  ) then
    raise exception 'Vous ne pouvez pas vous inviter vous-même';
  end if;

  display_name := left(btrim(coalesce(p_invitee_name, '')), 120);
  trade := left(btrim(coalesce(p_invitee_trade, '')), 40);

  delete from public.invitations
  where wedding_id = p_wedding_id
    and email = normalized
    and accepted_at is null;

  insert into public.invitations (
    wedding_id, email, token, invited_role, invited_by, expires_at, invitee_name, invitee_trade
  )
  values (
    p_wedding_id, normalized, p_token, p_role, uid, now() + interval '14 days', display_name, trade
  )
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'token', p_token);
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
    'venue_city', wedding.venue_city
  );
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
  notice text;
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

revoke all on function public.blank_last_name(text) from public, anon, authenticated;
revoke all on function public.create_couple_wedding(text, text, date, text, text, text) from public, anon;
revoke all on function public.create_wedding(text, text, date, text, text, text, text) from public, anon;
revoke all on function public.create_invitation(uuid, text, public.app_role, text, text, text) from public, anon;

grant execute on function public.create_couple_wedding(text, text, date, text, text, text) to authenticated;
grant execute on function public.create_wedding(text, text, date, text, text, text, text) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.app_role, text, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notification_reads'
    ) then
      alter publication supabase_realtime add table public.notification_reads;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wedding_members'
    ) then
      alter publication supabase_realtime add table public.wedding_members;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'invitations'
    ) then
      alter publication supabase_realtime add table public.invitations;
    end if;
  end if;
end $$;
