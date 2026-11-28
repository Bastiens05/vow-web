-- Replayable. Lets a vendor appear in the couple search. Off until they turn it on.
-- Does not change existing rows' visibility: the new column defaults to false.

alter table public.vendor_profiles
  add column if not exists discoverable boolean not null default false;

create or replace function public.search_discoverable_vendors(p_query text, p_category text)
returns table (
  user_id uuid,
  business_name text,
  person_name text,
  category text,
  city text,
  logo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  with cleaned as (
    select left(replace(replace(btrim(coalesce(p_query, '')), '%', ''), '_', ''), 80) as q,
           btrim(coalesce(p_category, '')) as trade
  )
  select v.user_id,
         v.business_name,
         coalesce(p.full_name, ''),
         v.category::text,
         v.city,
         v.logo_path
  from public.vendor_profiles v
  join public.profiles p on p.id = v.user_id
  cross join cleaned
  where v.discoverable
    and (cleaned.trade = '' or v.category::text = cleaned.trade)
    and (
      cleaned.q = ''
      or v.business_name ilike '%' || cleaned.q || '%'
      or p.full_name ilike '%' || cleaned.q || '%'
    )
  order by v.business_name
  limit 12;
$$;

revoke all on function public.search_discoverable_vendors(text, text) from public, anon;
grant execute on function public.search_discoverable_vendors(text, text) to authenticated;

create or replace function public.invite_discovered_vendor(p_wedding uuid, p_vendor uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  vendor_email text;
  vendor_name text;
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

  select lower(email), coalesce(full_name, '') into vendor_email, vendor_name
  from public.profiles where id = p_vendor;
  if vendor_email is null or vendor_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ce prestataire n''a pas d''adresse utilisable';
  end if;
  if exists (select 1 from public.profiles where id = uid and lower(email) = vendor_email) then
    raise exception 'Vous ne pouvez pas vous inviter vous-même';
  end if;

  delete from public.invitations
  where wedding_id = p_wedding and email = vendor_email and accepted_at is null;

  insert into public.invitations (
    wedding_id, email, token, invited_role, invited_by, expires_at, invitee_name, invitee_trade
  )
  select p_wedding, vendor_email, p_token, 'vendor', uid, now() + interval '14 days',
         left(v.business_name, 120), left(v.category::text, 40)
  from public.vendor_profiles v
  where v.user_id = p_vendor;

  return jsonb_build_object('token', p_token, 'email', vendor_email, 'name', vendor_name);
end;
$$;

revoke all on function public.invite_discovered_vendor(uuid, uuid, text) from public, anon;
grant execute on function public.invite_discovered_vendor(uuid, uuid, text) to authenticated;
