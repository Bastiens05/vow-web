-- Le couple peut inviter un prestataire. L'acceptation existante
-- rattache le compte dont l'e-mail correspond déjà.

create or replace function public.create_invitation(
  p_wedding_id uuid,
  p_email text,
  p_role public.app_role,
  p_token text
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
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  couple_host := public.is_wedding_couple(p_wedding_id);
  if public.is_wedding_vendor(p_wedding_id) then
    null;
  elsif couple_host and p_role in ('couple', 'vendor') then
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

  delete from public.invitations
  where wedding_id = p_wedding_id
    and email = normalized
    and accepted_at is null;

  insert into public.invitations (
    wedding_id, email, token, invited_role, invited_by, expires_at
  )
  values (
    p_wedding_id, normalized, p_token, p_role, uid, now() + interval '14 days'
  )
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'token', p_token);
end;
$$;

drop policy if exists invitations_couple_select on public.invitations;
create policy invitations_couple_select on public.invitations
  for select to authenticated
  using (
    public.is_wedding_couple(wedding_id)
    and (invited_role = 'couple' or invited_by = auth.uid())
  );
