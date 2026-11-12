create table public.proven_references (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  wedding_id uuid references public.weddings (id) on delete set null,
  month text not null,
  venue_name text not null,
  town text not null default '',
  review text not null default '',
  couple_public_name text,
  published boolean not null default false,
  confirmed boolean not null default false
);

alter table public.proven_references enable row level security;
grant select, insert, update, delete on public.proven_references to authenticated;
grant select on public.proven_references to anon;

create policy proven_references_owner on public.proven_references
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy proven_references_public on public.proven_references
  for select to anon, authenticated
  using (published and confirmed);
