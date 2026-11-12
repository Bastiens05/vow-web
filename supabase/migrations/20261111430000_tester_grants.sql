-- Offres testeur : un an offert, puis une remise enregistrée pour plus tard.
-- Lecture et écriture réservées aux administrateurs (is_admin).

create table public.tester_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  trade text not null default 'photographer',
  plan text not null default 'studio',
  free_until timestamptz not null,
  discount_percent integer not null default 40,
  status text not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  token text not null unique,
  vendor_id uuid references public.vendor_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint tester_grants_email_format check (email = lower(email) and position('@' in email) > 1),
  constraint tester_grants_plan check (plan in ('essentiel', 'pro', 'studio')),
  constraint tester_grants_status check (status in ('invited', 'accepted', 'revoked')),
  constraint tester_grants_discount check (discount_percent between 0 and 100),
  constraint tester_grants_names_len check (char_length(first_name) <= 80 and char_length(last_name) <= 80)
);

create unique index tester_grants_open_email on public.tester_grants (email) where status <> 'revoked';

alter table public.vendor_billing
  add column if not exists free_until timestamptz,
  add column if not exists discount_percent integer;

alter table public.tester_grants enable row level security;

revoke all on table public.tester_grants from public, anon;
grant select, insert, update on table public.tester_grants to authenticated;

create policy tester_grants_admin_all on public.tester_grants
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.lookup_tester_invite(p_token text)
returns table (
  email text,
  first_name text,
  last_name text,
  trade text,
  plan text
)
language sql
stable
security definer
set search_path = public
as $$
  select g.email, g.first_name, g.last_name, g.trade, g.plan
  from public.tester_grants g
  where g.token = p_token and g.status = 'invited';
$$;

create or replace function public.apply_comp_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_id uuid;
  granted text;
  until_at timestamptz;
  discount integer;
begin
  select g.id, g.plan, g.free_until, g.discount_percent
    into grant_id, granted, until_at, discount
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
    new.comped := false;
    new.tester_until := null;
    new.free_until := until_at;
    new.discount_percent := discount;
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
      where vendor_id = vid
        and comped is not true;
  end if;
end;
$$;

revoke all on function public.lookup_tester_invite(text) from public;
grant execute on function public.lookup_tester_invite(text) to anon, authenticated;
revoke all on function public.revoke_tester_grant(uuid) from public, anon;
grant execute on function public.revoke_tester_grant(uuid) to authenticated;

create or replace function public.create_tester_grant(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_trade text,
  p_plan text,
  p_discount integer
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
  if p_discount is null or p_discount < 0 or p_discount > 100 then
    raise exception 'Remise invalide';
  end if;
  if exists (select 1 from public.tester_grants where email = normalized and status <> 'revoked') then
    raise exception 'Une offre existe déjà pour cette adresse';
  end if;
  invite_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.tester_grants (
    email, first_name, last_name, trade, plan, free_until, discount_percent, invited_by, token
  )
  values (
    normalized,
    left(btrim(coalesce(p_first_name, '')), 80),
    left(btrim(coalesce(p_last_name, '')), 80),
    coalesce(nullif(btrim(p_trade), ''), 'photographer'),
    p_plan,
    now() + interval '1 year',
    p_discount,
    uid,
    invite_token
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

revoke all on function public.create_tester_grant(text, text, text, text, text, integer) from public, anon;
grant execute on function public.create_tester_grant(text, text, text, text, text, integer) to authenticated;
