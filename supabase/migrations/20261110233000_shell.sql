-- Global shell helpers: one isolated demo wedding per vendor, notification
-- preferences, and a logo path. Apply after 20261110230000_spaces.sql.
-- Does not let a vendor act as the couple on a real wedding.

alter table public.profiles
  add column if not exists notify_in_app boolean not null default true,
  add column if not exists notify_push boolean not null default true;

alter table public.vendor_profiles
  add column if not exists logo_path text;

alter table public.vendor_profiles
  drop constraint if exists vendor_profiles_logo_path_len;

alter table public.vendor_profiles
  add constraint vendor_profiles_logo_path_len
  check (logo_path is null or char_length(logo_path) between 1 and 300);

alter table public.weddings
  add column if not exists is_demo boolean not null default false,
  add column if not exists couple_preview boolean not null default false;

alter table public.weddings
  drop constraint if exists weddings_preview_requires_demo;

alter table public.weddings
  add constraint weddings_preview_requires_demo
  check (couple_preview = false or is_demo = true);

create unique index if not exists weddings_one_demo_per_vendor
  on public.weddings (created_by)
  where is_demo;

create or replace function public.guard_wedding_flags()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('vow.demo_write', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      if new.is_demo or new.couple_preview then
        raise exception 'Un mariage démo se crée avec Tester l''espace mariés';
      end if;
    elsif new.is_demo is distinct from old.is_demo
      or new.couple_preview is distinct from old.couple_preview then
      raise exception 'Ces indicateurs ne se modifient pas directement';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists weddings_guard_flags on public.weddings;
create trigger weddings_guard_flags
  before insert or update on public.weddings
  for each row execute function public.guard_wedding_flags();

create or replace function public.is_wedding_couple(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members
    where wedding_id = wid
      and user_id = auth.uid()
      and member_role = 'couple'
  )
  or exists (
    select 1
    from public.weddings w
    join public.wedding_members m
      on m.wedding_id = w.id
     and m.user_id = auth.uid()
    where w.id = wid
      and w.is_demo
      and w.couple_preview
      and w.created_by = auth.uid()
  );
$$;

create or replace function public.can_see_sheet(wid uuid, sheet text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mrole public.app_role;
  cat text;
  preview boolean;
begin
  if uid is null or sheet not in ('practical', 'photos', 'guests') then
    return false;
  end if;

  select member_role into mrole
  from public.wedding_members
  where wedding_id = wid and user_id = uid;

  if mrole is null then
    return false;
  end if;

  select w.is_demo and w.couple_preview and w.created_by = uid
    into preview
  from public.weddings w
  where w.id = wid;

  if mrole = 'couple' or coalesce(preview, false) or sheet = 'practical' then
    return true;
  end if;

  select category::text into cat
  from public.vendor_profiles
  where user_id = uid;

  if cat is null then
    return false;
  end if;
  if cat = 'planner' then
    return true;
  end if;
  if sheet = 'photos' then
    return cat in ('photographer', 'videographer');
  end if;
  if sheet = 'guests' then
    return cat in ('caterer', 'venue');
  end if;
  return false;
end;
$$;

create or replace function public.open_couple_demo()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  account_role public.app_role;
  wid uuid;
  business text;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  select role into account_role from public.profiles where id = uid;
  if account_role is distinct from 'vendor' then
    raise exception 'Seul un prestataire peut ouvrir l''espace démo';
  end if;

  perform set_config('vow.demo_write', 'on', true);

  select id into wid
  from public.weddings
  where created_by = uid and is_demo
  limit 1;

  if wid is not null then
    update public.weddings
    set couple_preview = true
    where id = wid;
    perform public.seed_demo_slots(wid, uid);
    return wid;
  end if;

  select coalesce(nullif(btrim(business_name), ''), 'Essai')
    into business
  from public.vendor_profiles
  where user_id = uid;

  insert into public.weddings (
    created_by,
    partner_one_name,
    partner_two_name,
    wedding_date,
    venue_name,
    venue_city,
    is_demo,
    couple_preview
  )
  values (
    uid,
    'Démo',
    left(coalesce(business, 'Essai'), 80),
    (current_date + 60),
    'Espace démo',
    '',
    true,
    true
  )
  returning id into wid;

  insert into public.wedding_members (wedding_id, user_id, member_role)
  values (wid, uid, 'vendor');

  perform public.seed_demo_slots(wid, uid);
  return wid;
end;
$$;

create or replace function public.seed_demo_slots(p_wedding_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.weddings where id = p_wedding_id and is_demo and created_by = p_user_id) then
    return;
  end if;
  if exists (select 1 from public.timeline_slots where wedding_id = p_wedding_id) then
    return;
  end if;
  insert into public.timeline_slots (wedding_id, title, starts_at, place, created_by, sort_order)
  values
    (p_wedding_id, 'Cérémonie', '16:00', 'Jardin', p_user_id, 1),
    (p_wedding_id, 'Dîner', '20:00', 'Salle', p_user_id, 2);
end;
$$;

revoke all on function public.seed_demo_slots(uuid, uuid) from public, anon, authenticated;

create or replace function public.leave_couple_preview(p_wedding_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  perform set_config('vow.demo_write', 'on', true);
  update public.weddings
  set couple_preview = false
  where id = p_wedding_id
    and created_by = uid
    and is_demo;
end;
$$;

create or replace function public.delete_couple_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  delete from public.weddings
  where created_by = uid
    and is_demo;
end;
$$;

revoke all on function public.open_couple_demo() from public, anon;
revoke all on function public.leave_couple_preview(uuid) from public, anon;
revoke all on function public.delete_couple_demo() from public, anon;
grant execute on function public.open_couple_demo() to authenticated;
grant execute on function public.leave_couple_preview(uuid) to authenticated;
grant execute on function public.delete_couple_demo() to authenticated;
