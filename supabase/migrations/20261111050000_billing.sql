-- Essai prestataire, abonnement, administrateurs et codes test.
-- Aucun code en clair n'est inséré ici : l'administrateur les crée depuis /admin.

create table public.admin_emails (
  email text primary key,
  constraint admin_emails_format check (email = lower(email) and position('@' in email) > 1)
);

insert into public.admin_emails (email) values ('bastsellier33@gmail.com');

create table public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.vendor_billing (
  vendor_id uuid primary key references public.vendor_profiles (id) on delete cascade,
  status text not null default 'trialing',
  trial_ends_at timestamptz not null,
  tester_until timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now(),
  constraint vendor_billing_status check (status in ('trialing', 'active', 'expired', 'tester'))
);

create table public.tester_codes (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  code_hash text not null unique,
  max_uses integer not null,
  use_count integer not null default 0,
  expires_at timestamptz,
  access_until timestamptz,
  created_at timestamptz not null default now(),
  constraint tester_codes_label_len check (char_length(label) between 2 and 80),
  constraint tester_codes_hash_len check (char_length(code_hash) = 64),
  constraint tester_codes_max_uses check (max_uses between 1 and 10000),
  constraint tester_codes_use_count check (use_count >= 0 and use_count <= max_uses)
);

create table public.tester_redemptions (
  code_id uuid not null references public.tester_codes (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code_id, vendor_id)
);

alter table public.vendor_profiles
  add column instagram text not null default '';

alter table public.vendor_profiles
  add constraint vendor_profiles_instagram_len check (char_length(instagram) <= 80);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.grant_admin_from_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.admin_emails where email = lower(new.email)) then
    insert into public.admins (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger profiles_grant_admin
  after insert on public.profiles
  for each row execute function public.grant_admin_from_email();

insert into public.admins (user_id)
select p.id
from public.profiles p
join public.admin_emails e on e.email = lower(p.email)
on conflict (user_id) do nothing;

create or replace function public.start_vendor_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vendor_billing (vendor_id, status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '7 days')
  on conflict (vendor_id) do nothing;
  return new;
end;
$$;

create trigger vendor_profiles_start_trial
  after insert on public.vendor_profiles
  for each row execute function public.start_vendor_trial();

create trigger vendor_billing_set_updated_at
  before update on public.vendor_billing
  for each row execute function public.set_updated_at();

insert into public.vendor_billing (vendor_id, status, trial_ends_at)
select id, 'trialing', now() + interval '7 days'
from public.vendor_profiles
on conflict (vendor_id) do nothing;

create or replace function public.weddings_creator_is_vendor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role public.app_role;
begin
  select role into account_role from public.profiles where id = new.created_by;
  if account_role is null then
    raise exception 'Profil introuvable';
  end if;
  if account_role not in ('vendor', 'couple') then
    raise exception 'Compte introuvable';
  end if;
  return new;
end;
$$;

create or replace function public.create_couple_wedding(
  p_partner_one text,
  p_partner_two text,
  p_wedding_date date,
  p_city text
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

  select wedding_id into wid
  from public.wedding_members
  where user_id = uid and member_role = 'couple'
  limit 1;
  if wid is not null then
    return wid;
  end if;

  insert into public.weddings (
    created_by, partner_one_name, partner_two_name, wedding_date, venue_name, venue_city
  )
  values (
    uid,
    btrim(p_partner_one),
    btrim(p_partner_two),
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

create or replace function public.tester_code_hash(p_code text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(btrim(coalesce(p_code, '')), 'sha256'), 'hex');
$$;

create or replace function public.create_tester_code(
  p_label text,
  p_code text,
  p_max_uses integer,
  p_expires timestamptz,
  p_access_until timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  clean text := btrim(coalesce(p_code, ''));
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administration';
  end if;
  if char_length(btrim(coalesce(p_label, ''))) < 2 then
    raise exception 'Indiquez un libellé';
  end if;
  if char_length(clean) < 8 or char_length(clean) > 64 then
    raise exception 'Le code doit faire entre 8 et 64 caractères';
  end if;
  if p_max_uses is null or p_max_uses < 1 then
    raise exception 'Indiquez un nombre d''utilisations';
  end if;
  insert into public.tester_codes (label, code_hash, max_uses, expires_at, access_until)
  values (btrim(p_label), public.tester_code_hash(clean), p_max_uses, p_expires, p_access_until)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.redeem_tester_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  vid uuid;
  rec public.tester_codes%rowtype;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select id into vid from public.vendor_profiles where user_id = uid;
  if vid is null then
    raise exception 'Réservé aux prestataires';
  end if;

  select * into rec
  from public.tester_codes
  where code_hash = public.tester_code_hash(p_code)
  for update;
  if rec.id is null then
    raise exception 'Code inconnu';
  end if;
  if rec.expires_at is not null and rec.expires_at <= now() then
    raise exception 'Code expiré';
  end if;

  if exists (select 1 from public.tester_redemptions where code_id = rec.id and vendor_id = vid) then
    update public.vendor_billing
      set status = 'tester', tester_until = rec.access_until
      where vendor_id = vid;
    return 'deja';
  end if;

  if rec.use_count >= rec.max_uses then
    raise exception 'Code épuisé';
  end if;

  update public.tester_codes set use_count = use_count + 1 where id = rec.id;
  insert into public.tester_redemptions (code_id, vendor_id) values (rec.id, vid);
  update public.vendor_billing
    set status = 'tester', tester_until = rec.access_until
    where vendor_id = vid;
  return 'ok';
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.tester_code_hash(text) from public, anon, authenticated;
revoke all on function public.create_couple_wedding(text, text, date, text) from public, anon;
revoke all on function public.create_tester_code(text, text, integer, timestamptz, timestamptz) from public, anon;
revoke all on function public.redeem_tester_code(text) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.create_couple_wedding(text, text, date, text) to authenticated;
grant execute on function public.create_tester_code(text, text, integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.redeem_tester_code(text) to authenticated;

alter table public.admin_emails enable row level security;
alter table public.admins enable row level security;
alter table public.vendor_billing enable row level security;
alter table public.tester_codes enable row level security;
alter table public.tester_redemptions enable row level security;

grant select on public.admins to authenticated;
grant select on public.vendor_billing to authenticated;
grant select on public.tester_codes to authenticated;
grant select on public.tester_redemptions to authenticated;

create policy admins_select on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy vendor_billing_select on public.vendor_billing
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );

create policy vendor_profiles_admin_select on public.vendor_profiles
  for select to authenticated
  using (public.is_admin());

create policy profiles_admin_select on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy tester_codes_admin on public.tester_codes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy tester_redemptions_select on public.tester_redemptions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_id and v.user_id = auth.uid()
    )
  );
