create table public.crew_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  name text not null,
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  rate_cents integer not null default 0,
  rate_kind text not null default 'hour',
  notes text not null default '',
  active boolean not null default true,
  constraint crew_rate_kind check (rate_kind in ('hour', 'day', 'flat')),
  constraint crew_name_len check (char_length(btrim(name)) between 2 and 80)
);

create table public.crew_assignments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  member_id uuid not null references public.crew_members (id) on delete cascade,
  role text not null default '',
  status text not null default 'invited',
  planned_minutes integer not null default 0,
  paid boolean not null default false,
  constraint crew_status check (status in ('invited', 'available', 'unavailable', 'confirmed'))
);

alter table public.crew_members enable row level security;
alter table public.crew_assignments enable row level security;
grant select, insert, update, delete on public.crew_members to authenticated;
grant select, insert, update, delete on public.crew_assignments to authenticated;

create policy crew_members_owner on public.crew_members
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy crew_assignments_owner on public.crew_assignments
  for all to authenticated
  using (exists (
    select 1 from public.crew_members m
    join public.vendor_profiles v on v.id = m.vendor_id
    where m.id = member_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.crew_members m
    join public.vendor_profiles v on v.id = m.vendor_id
    where m.id = member_id and v.user_id = auth.uid()
  ));

create policy crew_assignments_guest on public.crew_assignments
  for select to authenticated
  using (exists (
    select 1 from public.crew_members m
    join public.profiles p on lower(p.email) = lower(m.email)
    where m.id = member_id and p.id = auth.uid()
  ));
