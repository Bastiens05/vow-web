-- Les codes d'accès disparaissent. Les formules déjà appliquées sur vendor_billing restent.
-- Chaque nouveau profil prévient les administrateurs.

drop function if exists public.redeem_tester_code(text);
drop function if exists public.create_tester_code(text, text, integer, timestamptz, timestamptz);
drop function if exists public.create_share_code(text, text, integer, integer, timestamptz, text);
drop function if exists public.revoke_share_code(uuid);
drop function if exists public.apply_share_code(uuid, uuid);
drop function if exists public.tester_code_hash(text);

drop table if exists public.tester_redemptions;
drop table if exists public.tester_codes;

create table public.admin_notices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  body text not null,
  href text not null default '/admin',
  created_at timestamptz not null default now(),
  constraint admin_notices_body_len check (char_length(body) between 1 and 500),
  constraint admin_notices_href check (href = '/admin')
);

create table public.admin_notice_reads (
  notice_id uuid not null references public.admin_notices (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

alter table public.admin_notices enable row level security;
alter table public.admin_notice_reads enable row level security;

revoke all on table public.admin_notices from public, anon;
revoke all on table public.admin_notice_reads from public, anon;
grant select on table public.admin_notices to authenticated;
grant select on table public.admin_notice_reads to authenticated;

create policy admin_notices_select on public.admin_notices
  for select to authenticated
  using (public.is_admin());

create policy admin_notice_reads_select on public.admin_notice_reads
  for select to authenticated
  using (user_id = auth.uid() and public.is_admin());

create or replace function public.vendor_trade_label(p_trade text)
returns text
language sql
immutable
as $$
  select case p_trade
    when 'photographer' then 'Photographe'
    when 'videographer' then 'Vidéaste'
    when 'dj' then 'DJ / musique'
    when 'florist' then 'Fleuriste'
    when 'caterer' then 'Traiteur'
    when 'venue' then 'Lieu de réception'
    when 'planner' then 'Wedding planner'
    when 'beauty' then 'Coiffure / maquillage'
    when 'officiant' then 'Officiant'
    when 'other' then 'Autre'
    else null
  end;
$$;

create or replace function public.signup_notice_body(p_role text, p_email text, p_trade text)
returns text
language plpgsql
immutable
as $$
declare
  trade_label text;
begin
  if p_role = 'vendor' then
    trade_label := public.vendor_trade_label(p_trade);
    if trade_label is not null then
      return left('Nouveau compte prestataire : ' || p_email || ' · ' || trade_label, 500);
    end if;
    return left('Nouveau compte prestataire : ' || p_email, 500);
  end if;
  return left('Nouveau compte mariés : ' || p_email, 500);
end;
$$;

create or replace function public.notify_admins_of_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  trade text;
begin
  select u.raw_user_meta_data ->> 'category' into trade
  from auth.users u
  where u.id = new.id;
  insert into public.admin_notices (profile_id, body)
  values (new.id, public.signup_notice_body(new.role::text, new.email, trade))
  on conflict (profile_id) do update
    set body = excluded.body;
  return new;
end;
$$;

drop trigger if exists profiles_notify_admins on public.profiles;
create trigger profiles_notify_admins
  after insert on public.profiles
  for each row execute function public.notify_admins_of_signup();

create or replace function public.refresh_signup_notice_trade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.admin_notices n
    set body = public.signup_notice_body('vendor', p.email, new.category)
    from public.profiles p
    where n.profile_id = new.user_id
      and p.id = new.user_id;
  return new;
end;
$$;

drop trigger if exists vendor_profiles_refresh_signup_notice on public.vendor_profiles;
create trigger vendor_profiles_refresh_signup_notice
  after insert on public.vendor_profiles
  for each row execute function public.refresh_signup_notice_trade();

create or replace function public.mark_admin_notices_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not public.is_admin() then
    return;
  end if;
  insert into public.admin_notice_reads (notice_id, user_id)
  select n.id, uid
  from public.admin_notices n
  where not exists (
    select 1 from public.admin_notice_reads r
    where r.notice_id = n.id and r.user_id = uid
  );
end;
$$;

revoke all on function public.vendor_trade_label(text) from public, anon;
revoke all on function public.signup_notice_body(text, text, text) from public, anon;
revoke all on function public.notify_admins_of_signup() from public, anon, authenticated;
revoke all on function public.refresh_signup_notice_trade() from public, anon, authenticated;
revoke all on function public.mark_admin_notices_seen() from public, anon;
grant execute on function public.mark_admin_notices_seen() to authenticated;

alter table public.admin_notices replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_notices'
    ) then
      alter publication supabase_realtime add table public.admin_notices;
    end if;
  end if;
end $$;
