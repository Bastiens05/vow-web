-- A quote uploaded by the couple, confirmed, then turned into an invitation.
-- No commission is taken.

create table public.quote_intakes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default '',
  business_name text not null default '',
  category text not null default 'other',
  email text not null default '',
  phone text not null default '',
  amount_cents integer,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  constraint quote_intakes_status check (status in ('draft', 'sent')),
  constraint quote_intakes_amount check (amount_cents is null or amount_cents >= 0)
);

alter table public.quote_intakes enable row level security;
grant select, insert, update, delete on public.quote_intakes to authenticated;

create policy quote_intakes_couple on public.quote_intakes
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy quote_intakes_vendor_read on public.quote_intakes
  for select to authenticated
  using (
    status = 'sent'
    and public.is_wedding_member(wedding_id)
    and lower(email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
  );
