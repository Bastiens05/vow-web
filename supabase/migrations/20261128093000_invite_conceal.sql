-- Replayable. Not applied yet.
-- A search invitation keeps the address on the row for the server.
-- The couple cannot read it from invitations. The card function returns null.
-- A hand-typed invitation stays readable: the couple sees the address they entered.

alter table public.invitations
  add column if not exists invite_source text not null default 'manual';

alter table public.invitations
  drop constraint if exists invitations_invite_source;

alter table public.invitations
  add constraint invitations_invite_source check (invite_source in ('manual', 'search'));

-- Best effort. A vendor invite whose address, name and trade already match a
-- profile was produced by the search. A hand-typed invite matches only when
-- those three fields were copied exactly. Vendors who later leave the search
-- are included, otherwise turning it off would show the address again.
update public.invitations i
set invite_source = 'search'
where i.invited_role = 'vendor'
  and i.invite_source = 'manual'
  and i.invitee_name <> ''
  and i.invitee_trade <> ''
  and exists (
    select 1
    from public.vendor_profiles v
    join public.profiles p on p.id = v.user_id
    where lower(p.email) = lower(i.email)
      and left(v.business_name, 120) = i.invitee_name
      and left(v.category::text, 40) = i.invitee_trade
  );

create or replace function public.invite_discovered_vendor(p_wedding uuid, p_vendor uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  vendor_email text;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  if not public.is_wedding_couple(p_wedding) then
    raise exception 'Réservé aux mariés';
  end if;
  if p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Jeton d''invitation invalide';
  end if;
  if not exists (
    select 1 from public.vendor_profiles where user_id = p_vendor and discoverable
  ) then
    raise exception 'Ce prestataire n''apparaît pas dans la recherche';
  end if;
  if exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and user_id = p_vendor
  ) then
    raise exception 'Ce prestataire est déjà dans le mariage';
  end if;

  select lower(email) into vendor_email from public.profiles where id = p_vendor;
  if vendor_email is null or vendor_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ce prestataire n''a pas d''adresse utilisable';
  end if;
  if exists (select 1 from public.profiles where id = uid and lower(email) = vendor_email) then
    raise exception 'Vous ne pouvez pas vous inviter vous-même';
  end if;

  delete from public.invitations
  where wedding_id = p_wedding and email = vendor_email and accepted_at is null;

  insert into public.invitations (
    wedding_id, email, token, invited_role, invited_by, expires_at, invitee_name, invitee_trade, invite_source
  )
  select p_wedding, vendor_email, p_token, 'vendor', uid, now() + interval '14 days',
         left(v.business_name, 120), left(v.category::text, 40), 'search'
  from public.vendor_profiles v
  where v.user_id = p_vendor;

  return jsonb_build_object('token', p_token);
end;
$$;

revoke all on function public.invite_discovered_vendor(uuid, uuid, text) from public, anon;
grant execute on function public.invite_discovered_vendor(uuid, uuid, text) to authenticated;

create or replace function public.couple_invitation_cards(p_wedding uuid)
returns table (
  id uuid,
  wedding_id uuid,
  email text,
  token text,
  invited_role public.app_role,
  invited_by uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid,
  invitee_name text,
  invitee_trade text,
  invite_source text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id,
         i.wedding_id,
         case when i.invite_source = 'search' then null else i.email end,
         i.token,
         i.invited_role,
         i.invited_by,
         i.expires_at,
         i.accepted_at,
         i.accepted_by,
         i.invitee_name,
         i.invitee_trade,
         i.invite_source,
         i.created_at
  from public.invitations i
  where i.wedding_id = p_wedding
    and public.is_wedding_couple(p_wedding)
    and (i.invited_role = 'couple' or i.invited_by = auth.uid());
$$;

revoke all on function public.couple_invitation_cards(uuid) from public, anon;
grant execute on function public.couple_invitation_cards(uuid) to authenticated;

drop policy if exists invitations_couple_select on public.invitations;
create policy invitations_couple_select on public.invitations
  for select to authenticated
  using (
    public.is_wedding_couple(wedding_id)
    and (invited_role = 'couple' or invited_by = auth.uid())
    and invite_source <> 'search'
  );

-- The card shows the token. Preview must not hand the address back to the couple.
create or replace function public.preview_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invitations%rowtype;
  wedding public.weddings%rowtype;
  caller text := lower(coalesce(auth.jwt() ->> 'email', ''));
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
    'email', case
      when invite.invite_source = 'search' and caller is distinct from lower(invite.email) then ''
      else invite.email
    end,
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
