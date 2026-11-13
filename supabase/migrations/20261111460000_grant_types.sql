-- Deux invitations admin : testeur (un an, puis remise) ou offert à vie.
-- Les policies de tester_grants ne changent pas.

alter table public.tester_grants
  add column if not exists grant_type text not null default 'tester';

alter table public.tester_grants
  drop constraint if exists tester_grants_type;
alter table public.tester_grants
  add constraint tester_grants_type check (grant_type in ('tester', 'lifetime'));

alter table public.tester_grants
  alter column free_until drop not null,
  alter column discount_percent drop not null;

alter table public.tester_grants
  drop constraint if exists tester_grants_discount;
alter table public.tester_grants
  add constraint tester_grants_discount check (discount_percent is null or discount_percent between 0 and 100);

alter table public.tester_grants
  drop constraint if exists tester_grants_type_shape;
alter table public.tester_grants
  add constraint tester_grants_type_shape check (
    (grant_type = 'tester' and free_until is not null and discount_percent is not null)
    or (grant_type = 'lifetime' and discount_percent is null)
  );

create or replace function public.apply_comp_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_id uuid;
  grant_type text;
  granted text;
  until_at timestamptz;
  discount integer;
begin
  select g.id, g.grant_type, g.plan, g.free_until, g.discount_percent
    into grant_id, grant_type, granted, until_at, discount
  from public.tester_grants g
  join public.vendor_profiles v on v.id = new.vendor_id
  join public.profiles p on p.id = v.user_id
  where g.email = lower(p.email)
    and g.status in ('invited', 'accepted')
  order by g.created_at desc
  limit 1;

  if grant_id is not null then
    new.plan := granted;
    new.status := 'active';
    new.tester_until := null;
    if grant_type = 'lifetime' then
      new.comped := true;
      new.free_until := null;
      new.discount_percent := null;
    else
      new.comped := false;
      new.free_until := until_at;
      new.discount_percent := discount;
    end if;
    update public.tester_grants
      set status = 'accepted',
          accepted_at = coalesce(accepted_at, now()),
          vendor_id = new.vendor_id
      where id = grant_id and status <> 'revoked';
    return new;
  end if;

  select c.plan into granted
  from public.comp_plan_emails c
  join public.vendor_profiles v on v.id = new.vendor_id
  join public.profiles p on p.id = v.user_id
  where c.email = lower(p.email);
  if granted is not null then
    new.plan := granted;
    new.status := 'active';
    new.comped := true;
    new.tester_until := null;
    new.free_until := null;
    new.discount_percent := null;
    return new;
  end if;

  return new;
end;
$$;

create or replace function public.revoke_tester_grant(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  vid uuid;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.tester_grants
    set status = 'revoked', revoked_at = now()
    where id = p_id and status <> 'revoked'
    returning vendor_id into vid;
  if vid is not null then
    update public.vendor_billing
      set free_until = null,
          discount_percent = null,
          plan = 'essentiel',
          status = case
            when trial_ends_at > now() then 'trialing'
            else 'expired'
          end,
          comped = false
      where vendor_id = vid;
  end if;
end;
$$;

drop function if exists public.create_tester_grant(text, text, text, text, text, integer);

create function public.create_tester_grant(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_trade text,
  p_plan text,
  p_discount integer,
  p_grant_type text default 'tester'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text := lower(btrim(p_email));
  grant_id uuid;
  invite_token text;
  vid uuid;
  kind text := coalesce(nullif(btrim(p_grant_type), ''), 'tester');
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if normalized is null or position('@' in normalized) <= 1 then
    raise exception 'Indiquez un e-mail valide';
  end if;
  if p_plan is null or p_plan not in ('essentiel', 'pro', 'studio') then
    raise exception 'Formule inconnue';
  end if;
  if kind not in ('tester', 'lifetime') then
    raise exception 'Type d''invitation inconnu';
  end if;
  if kind = 'tester' and (p_discount is null or p_discount < 0 or p_discount > 100) then
    raise exception 'Remise invalide';
  end if;
  if exists (select 1 from public.tester_grants where email = normalized and status <> 'revoked') then
    raise exception 'Une offre existe déjà pour cette adresse';
  end if;
  invite_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.tester_grants (
    email, first_name, last_name, trade, plan, free_until, discount_percent, invited_by, token, grant_type
  )
  values (
    normalized,
    left(btrim(coalesce(p_first_name, '')), 80),
    left(btrim(coalesce(p_last_name, '')), 80),
    coalesce(nullif(btrim(p_trade), ''), 'photographer'),
    p_plan,
    case when kind = 'tester' then now() + interval '1 year' else null end,
    case when kind = 'tester' then p_discount else null end,
    uid,
    invite_token,
    kind
  )
  returning id into grant_id;

  select v.id into vid
  from public.vendor_profiles v
  join public.profiles p on p.id = v.user_id
  where lower(p.email) = normalized
  limit 1;
  if vid is not null then
    update public.vendor_billing set plan = p_plan where vendor_id = vid;
  end if;
  return grant_id;
end;
$$;

revoke all on function public.create_tester_grant(text, text, text, text, text, integer, text) from public, anon;
grant execute on function public.create_tester_grant(text, text, text, text, text, integer, text) to authenticated;
