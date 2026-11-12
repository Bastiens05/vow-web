create table public.vendor_credentials (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  file_name text not null,
  expires_on date,
  share_globally boolean not null default false,
  constraint vendor_credentials_kind check (kind in ('rc_pro', 'kbis', 'urssaf', 'gear', 'sacem', 'haccp', 'other'))
);

create table public.credential_shares (
  credential_id uuid not null references public.vendor_credentials (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  primary key (credential_id, wedding_id)
);

create table public.credential_links (
  token text primary key,
  credential_id uuid not null references public.vendor_credentials (id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.vendor_credentials enable row level security;
alter table public.credential_shares enable row level security;
alter table public.credential_links enable row level security;

grant select, insert, update, delete on public.vendor_credentials to authenticated;
grant select, insert, delete on public.credential_shares to authenticated;
grant select, insert, delete on public.credential_links to authenticated;

create policy vendor_credentials_owner on public.vendor_credentials
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy credential_shares_owner on public.credential_shares
  for all to authenticated
  using (exists (
    select 1 from public.vendor_credentials c
    join public.vendor_profiles v on v.id = c.vendor_id
    where c.id = credential_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.vendor_credentials c
    join public.vendor_profiles v on v.id = c.vendor_id
    where c.id = credential_id and v.user_id = auth.uid()
  ));

create policy credential_links_owner on public.credential_links
  for all to authenticated
  using (exists (
    select 1 from public.vendor_credentials c
    join public.vendor_profiles v on v.id = c.vendor_id
    where c.id = credential_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.vendor_credentials c
    join public.vendor_profiles v on v.id = c.vendor_id
    where c.id = credential_id and v.user_id = auth.uid()
  ));
