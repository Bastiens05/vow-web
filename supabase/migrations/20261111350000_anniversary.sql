create table public.anniversary_templates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  title text not null,
  body text not null,
  months_after integer not null default 12,
  enabled boolean not null default false,
  require_review boolean not null default true
);

create table public.anniversary_queue (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.anniversary_templates (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  send_on date not null,
  status text not null default 'queued',
  constraint anniversary_queue_status check (status in ('queued', 'approved', 'skipped', 'sent'))
);

create table public.marketing_optouts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  vendor_id uuid references public.vendor_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index marketing_optouts_vendor on public.marketing_optouts (email, vendor_id) where vendor_id is not null;
create unique index marketing_optouts_global on public.marketing_optouts (email) where vendor_id is null;

alter table public.anniversary_templates enable row level security;
alter table public.anniversary_queue enable row level security;
alter table public.marketing_optouts enable row level security;

grant select, insert, update, delete on public.anniversary_templates to authenticated;
grant select, insert, update, delete on public.anniversary_queue to authenticated;
grant select, insert, delete on public.marketing_optouts to authenticated;

create policy anniversary_templates_owner on public.anniversary_templates
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy anniversary_queue_owner on public.anniversary_queue
  for all to authenticated
  using (exists (
    select 1 from public.anniversary_templates t
    join public.vendor_profiles v on v.id = t.vendor_id
    where t.id = template_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.anniversary_templates t
    join public.vendor_profiles v on v.id = t.vendor_id
    where t.id = template_id and v.user_id = auth.uid()
  ));

create policy marketing_optouts_owner on public.marketing_optouts
  for all to authenticated
  using (vendor_id is null or exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (vendor_id is null or exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));
