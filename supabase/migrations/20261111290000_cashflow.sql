-- Seasonal cash view for a vendor. Couples cannot read these rows.

create table public.payment_installments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  due_on date not null,
  amount_cents integer not null,
  collected_on date,
  constraint payment_installments_amount check (amount_cents >= 0)
);

create table public.wedding_time_entries (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  kind text not null,
  minutes integer not null default 0,
  note text not null default '',
  constraint wedding_time_kind check (kind in ('prep', 'travel', 'day', 'post')),
  constraint wedding_time_minutes check (minutes between 0 and 20000)
);

create table public.cashflow_snapshots (
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  month date not null,
  collected_cents integer not null default 0,
  scheduled_cents integer not null default 0,
  unscheduled_cents integer not null default 0,
  primary key (vendor_id, month)
);

create table public.vendor_cash_settings (
  vendor_id uuid primary key references public.vendor_profiles (id) on delete cascade,
  thin_cents integer not null default 0,
  include_unsigned boolean not null default false
);

create table public.cash_notices (
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  month date not null,
  primary key (vendor_id, month)
);

alter table public.payment_installments enable row level security;
alter table public.wedding_time_entries enable row level security;
alter table public.cashflow_snapshots enable row level security;
alter table public.vendor_cash_settings enable row level security;
alter table public.cash_notices enable row level security;

grant select, insert, update, delete on public.payment_installments to authenticated;
grant select, insert, update, delete on public.wedding_time_entries to authenticated;
grant select on public.cashflow_snapshots to authenticated;
grant select, insert, update on public.vendor_cash_settings to authenticated;
grant select on public.cash_notices to authenticated;

create policy payment_installments_vendor on public.payment_installments
  for all to authenticated
  using (exists (select 1 from public.quotes q join public.vendor_profiles v on v.id = q.vendor_id where q.id = quote_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.quotes q join public.vendor_profiles v on v.id = q.vendor_id where q.id = quote_id and v.user_id = auth.uid()));

create policy wedding_time_vendor on public.wedding_time_entries
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy cashflow_vendor on public.cashflow_snapshots
  for select to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy cash_settings_vendor on public.vendor_cash_settings
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create or replace function public.rebuild_cashflow()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cashflow_snapshots;
  insert into public.cashflow_snapshots (vendor_id, month, collected_cents, scheduled_cents, unscheduled_cents)
  select q.vendor_id,
    date_trunc('month', i.due_on)::date,
    coalesce(sum(i.amount_cents) filter (where i.collected_on is not null and q.status in ('accepted', 'invoiced')), 0),
    coalesce(sum(i.amount_cents) filter (where i.collected_on is null and q.status in ('accepted', 'invoiced')), 0),
    coalesce(sum(i.amount_cents) filter (where q.status not in ('accepted', 'invoiced', 'cancelled')), 0)
  from public.payment_installments i
  join public.quotes q on q.id = i.quote_id
  where q.status <> 'cancelled'
  group by q.vendor_id, date_trunc('month', i.due_on);
end;
$$;

revoke all on function public.rebuild_cashflow() from public;
grant execute on function public.rebuild_cashflow() to anon, authenticated;

create policy cash_notices_vendor on public.cash_notices
  for select to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));
