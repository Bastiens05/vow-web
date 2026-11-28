-- Replayable. Not applied yet.
-- Search invitations no longer expose the vendor email to the couple.
-- The address stays on the row for the server. The card only receives the name and the trade.

alter table public.invitations
  add column if not exists conceal_contact boolean not null default false;

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
    wedding_id, email, token, invited_role, invited_by, expires_at, invitee_name, invitee_trade, conceal_contact
  )
  select p_wedding, vendor_email, p_token, 'vendor', uid, now() + interval '14 days',
         left(v.business_name, 120), left(v.category::text, 40), true
  from public.vendor_profiles v
  where v.user_id = p_vendor;

  return jsonb_build_object('token', p_token);
end;
$$;

revoke all on function public.invite_discovered_vendor(uuid, uuid, text) from public, anon;
grant execute on function public.invite_discovered_vendor(uuid, uuid, text) to authenticated;
