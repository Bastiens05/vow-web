-- Offre pour un prestataire déjà inscrit : carte dans la cloche, activation au clic.
-- Un compte absent est toujours activé à l'inscription, par apply_comp_plan.

create table public.grant_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  grant_id uuid not null unique references public.tester_grants (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  activated_at timestamptz,
  constraint grant_notices_body_len check (char_length(body) between 1 and 500)
);

create index grant_notices_user_idx on public.grant_notices (user_id, created_at desc);

alter table public.grant_notices enable row level security;

revoke all on table public.grant_notices from public, anon;
grant select on table public.grant_notices to authenticated;

create policy grant_notices_select on public.grant_notices
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.apply_comp_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_id uuid;
  grant_type text;
  grant_status text;
  granted text;
  until_at timestamptz;
  discount integer;
begin
  select g.id, g.grant_type, g.status, g.plan, g.free_until, g.discount_percent
    into grant_id, grant_type, grant_status, granted, until_at, discount
  from public.tester_grants g
  join public.vendor_profiles v on v.id = new.vendor_id
  join public.profiles p on p.id = v.user_id
  where g.email = lower(p.email)
    and g.status in ('invited', 'accepted')
  order by g.created_at desc
  limit 1;

  -- A new account is activated on insert. An existing account stays unchanged
  -- until the vendor presses Activer, which marks the grant accepted first.
  if grant_id is not null and (tg_op = 'INSERT' or grant_status = 'accepted') then
    new.plan := granted;
    new.status := 'active';
    if grant_type = 'lifetime' then
      new.comped := true;
      new.tester_until := null;
      new.free_until := null;
      new.discount_percent := null;
    else
      if tg_op = 'INSERT' and grant_status = 'invited' then
        until_at := now() + interval '1 year';
      end if;
      new.comped := true;
      new.tester_until := until_at;
      new.free_until := until_at;
      new.discount_percent := discount;
    end if;
    update public.tester_grants
      set status = 'accepted',
          accepted_at = coalesce(accepted_at, now()),
          vendor_id = new.vendor_id,
          free_until = case when grant_type = 'tester' then until_at else free_until end
      where id = grant_id and status <> 'revoked';
    update public.grant_notices
      set activated_at = coalesce(activated_at, now())
      where grant_id = grant_id;
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
  delete from public.grant_notices where grant_id = p_id;
  if vid is not null then
    update public.vendor_billing
      set free_until = null,
          discount_percent = null,
          tester_until = null,
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

drop function if exists public.create_tester_grant(text, text, text, text, text, integer, text);

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
  vendor_user uuid;
  kind text := coalesce(nullif(btrim(p_grant_type), ''), 'tester');
  plan_label text;
  notice text;
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

  select p.id into vendor_user
  from public.vendor_profiles v
  join public.profiles p on p.id = v.user_id
  where lower(p.email) = normalized
  limit 1;

  if vendor_user is not null then
    plan_label := case p_plan when 'pro' then 'Pro' when 'studio' then 'Studio' else 'Essentiel' end;
    notice := case
      when kind = 'lifetime' then 'VOW vous offre ' || plan_label || ' pour toujours.'
      else 'VOW vous offre ' || plan_label || ' pendant un an, puis -' || p_discount::text || ' % à vie.'
    end;
    insert into public.grant_notices (user_id, grant_id, body) values (vendor_user, grant_id, notice);
  end if;

  return grant_id;
end;
$$;

revoke all on function public.create_tester_grant(text, text, text, text, text, integer, text) from public, anon;
grant execute on function public.create_tester_grant(text, text, text, text, text, integer, text) to authenticated;

create or replace function public.activate_tester_grant(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text;
  vid uuid;
  kind text;
  granted text;
  until_at timestamptz;
  discount integer;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select id into vid from public.vendor_profiles where user_id = uid;
  if vid is null then
    raise exception 'Réservé aux prestataires';
  end if;
  select lower(email) into normalized from public.profiles where id = uid;
  select g.grant_type, g.plan, g.free_until, g.discount_percent
    into kind, granted, until_at, discount
  from public.tester_grants g
  where g.id = p_id and g.email = normalized and g.status = 'invited';
  if kind is null then
    raise exception 'Invitation introuvable';
  end if;
  if kind = 'tester' then
    until_at := now() + interval '1 year';
  else
    until_at := null;
    discount := null;
  end if;
  update public.tester_grants
    set status = 'accepted',
        accepted_at = coalesce(accepted_at, now()),
        vendor_id = vid,
        free_until = until_at
    where id = p_id and status = 'invited';
  update public.vendor_billing
    set plan = granted,
        status = 'active',
        comped = true,
        tester_until = case when kind = 'lifetime' then null else until_at end,
        free_until = case when kind = 'lifetime' then null else until_at end,
        discount_percent = case when kind = 'lifetime' then null else discount end
    where vendor_id = vid;
  if not found then
    insert into public.vendor_billing (vendor_id, status, trial_ends_at, plan, comped, tester_until, free_until, discount_percent)
    values (
      vid,
      'active',
      now() + interval '7 days',
      granted,
      true,
      case when kind = 'lifetime' then null else until_at end,
      case when kind = 'lifetime' then null else until_at end,
      case when kind = 'lifetime' then null else discount end
    );
  end if;
  update public.grant_notices
    set activated_at = coalesce(activated_at, now())
    where grant_id = p_id and user_id = uid;
end;
$$;

revoke all on function public.activate_tester_grant(uuid) from public, anon;
grant execute on function public.activate_tester_grant(uuid) to authenticated;

create or replace function public.mark_grant_notices_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.grant_notices
    set seen_at = now()
    where user_id = auth.uid() and seen_at is null;
end;
$$;

revoke all on function public.mark_grant_notices_seen() from public, anon;
grant execute on function public.mark_grant_notices_seen() to authenticated;

alter table public.grant_notices replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'grant_notices'
    ) then
      alter publication supabase_realtime add table public.grant_notices;
    end if;
  end if;
end $$;
