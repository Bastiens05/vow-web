-- Devis et factures. Apply in the Supabase SQL editor. Do not edit an issued invoice.
-- Invoice numbers are allocated per vendor, one step at a time, and stay frozen.

alter table public.invoices
  add column seller_name text not null default '',
  add column seller_siret text not null default '',
  add column seller_address text not null default '',
  add column client_name text not null default '',
  add column vat_exempt boolean not null default true,
  add column payment_terms text not null default '';

create table public.vendor_billing_identity (
  vendor_id uuid primary key references public.vendor_profiles (id) on delete cascade,
  siret text not null default '',
  legal_address text not null default '',
  vat_exempt boolean not null default true,
  payment_terms text not null default 'Paiement à réception',
  updated_at timestamptz not null default now(),
  constraint vendor_billing_siret check (siret = '' or siret ~ '^[0-9]{14}$')
);

create table public.vendor_invoice_counters (
  vendor_id uuid primary key references public.vendor_profiles (id) on delete cascade,
  last_number integer not null default 0,
  constraint vendor_invoice_counters_positive check (last_number >= 0)
);

insert into public.vendor_invoice_counters (vendor_id, last_number)
select vendor_id, max(number)
from public.invoices
group by vendor_id;

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.vendor_invoice_counters (vendor_id, last_number)
  values (new.vendor_id, 1)
  on conflict (vendor_id) do update
    set last_number = public.vendor_invoice_counters.last_number + 1
  returning last_number into n;
  new.number := n;
  return new;
end;
$$;

create trigger invoices_assign_number
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();

create or replace function public.lock_issued_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.number is distinct from old.number
     or new.amount_cents is distinct from old.amount_cents
     or new.title is distinct from old.title
     or new.vendor_id is distinct from old.vendor_id
     or new.wedding_id is distinct from old.wedding_id
     or new.seller_name is distinct from old.seller_name
     or new.seller_siret is distinct from old.seller_siret
     or new.seller_address is distinct from old.seller_address
     or new.client_name is distinct from old.client_name
     or new.vat_exempt is distinct from old.vat_exempt
     or new.payment_terms is distinct from old.payment_terms
     or new.due_on is distinct from old.due_on
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Facture déjà émise';
  end if;
  if new.status is distinct from old.status and new.status not in ('pending', 'paid') then
    raise exception 'Statut de facture invalide';
  end if;
  return new;
end;
$$;

create trigger invoices_lock_issued
  before update on public.invoices
  for each row execute function public.lock_issued_invoice();

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  kind text not null,
  method text not null,
  amount_cents integer not null,
  paid_on date not null,
  created_at timestamptz not null default now(),
  constraint invoice_payments_kind check (kind in ('acompte', 'solde')),
  constraint invoice_payments_method check (method in ('virement', 'cb', 'especes', 'cheque')),
  constraint invoice_payments_amount check (amount_cents > 0)
);

create index invoice_payments_invoice_idx on public.invoice_payments (invoice_id, paid_on);
create index invoice_payments_vendor_idx on public.invoice_payments (vendor_id, paid_on);

alter table public.vendor_billing_identity enable row level security;
alter table public.vendor_invoice_counters enable row level security;
alter table public.invoice_payments enable row level security;

revoke all on table public.vendor_billing_identity from public, anon;
revoke all on table public.vendor_invoice_counters from public, anon;
revoke all on table public.invoice_payments from public, anon;

grant select, insert, update on table public.vendor_billing_identity to authenticated;
grant select on table public.vendor_invoice_counters to authenticated;
grant select, insert on table public.invoice_payments to authenticated;

create policy vendor_billing_identity_all on public.vendor_billing_identity
  for all to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id));

create policy vendor_invoice_counters_select on public.vendor_invoice_counters
  for select to authenticated
  using (public.owns_vendor(vendor_id));

create policy invoice_payments_select on public.invoice_payments
  for select to authenticated
  using (public.owns_vendor(vendor_id) or public.is_wedding_couple(wedding_id));

create policy invoice_payments_insert on public.invoice_payments
  for insert to authenticated
  with check (
    public.owns_vendor(vendor_id)
    and public.is_wedding_vendor(wedding_id)
    and exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.vendor_id = vendor_id
        and i.wedding_id = wedding_id
    )
  );

create or replace function public.issue_invoice_from_quote(p_quote uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quotes%rowtype;
  seller text;
  siret text := '';
  address text := '';
  exempt boolean := true;
  terms text := 'Paiement à réception';
  client text;
  new_id uuid;
begin
  select * into q from public.quotes where id = p_quote;
  if not found then
    raise exception 'Devis introuvable';
  end if;
  if not public.owns_vendor(q.vendor_id) or not public.is_wedding_vendor(q.wedding_id) then
    raise exception 'Interdit';
  end if;
  if q.status = 'invoiced' or exists (select 1 from public.invoices i where i.quote_id = q.id) then
    raise exception 'Déjà facturé';
  end if;

  select v.business_name into seller
  from public.vendor_profiles v
  where v.id = q.vendor_id;

  select b.siret, b.legal_address, b.vat_exempt, b.payment_terms
    into siret, address, exempt, terms
  from public.vendor_billing_identity b
  where b.vendor_id = q.vendor_id;

  select trim(both ' ' from concat_ws(' & ',
    nullif(trim(concat_ws(' ', w.partner_one_name, w.partner_one_last_name)), ''),
    nullif(trim(concat_ws(' ', w.partner_two_name, w.partner_two_last_name)), '')
  ))
  into client
  from public.weddings w
  where w.id = q.wedding_id;

  insert into public.invoices (
    wedding_id, vendor_id, quote_id, number, title, amount_cents, due_on, status,
    seller_name, seller_siret, seller_address, client_name, vat_exempt, payment_terms
  ) values (
    q.wedding_id,
    q.vendor_id,
    q.id,
    0,
    q.title,
    q.amount_cents,
    (current_date + 14),
    'pending',
    coalesce(seller, ''),
    coalesce(siret, ''),
    coalesce(address, ''),
    coalesce(client, ''),
    coalesce(exempt, true),
    coalesce(nullif(terms, ''), 'Paiement à réception')
  )
  returning id into new_id;

  update public.quotes set status = 'invoiced' where id = q.id;
  return new_id;
end;
$$;

drop policy if exists invoices_write on public.invoices;

create policy invoices_insert on public.invoices
  for insert to authenticated
  with check (public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id));

create policy invoices_update on public.invoices
  for update to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id));

revoke all on function public.assign_invoice_number() from public, anon;
revoke all on function public.lock_issued_invoice() from public, anon;
grant execute on function public.assign_invoice_number() to authenticated;
grant execute on function public.lock_issued_invoice() to authenticated;
revoke all on function public.issue_invoice_from_quote(uuid) from public, anon;
grant execute on function public.issue_invoice_from_quote(uuid) to authenticated;
