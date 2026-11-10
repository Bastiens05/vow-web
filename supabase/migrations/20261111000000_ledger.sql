-- Quotes, invoices, deposits and reviews. Apply after 20261110233000_shell.sql.

alter table public.wedding_notifications drop constraint if exists wedding_notifications_kind;
alter table public.wedding_notifications
  add constraint wedding_notifications_kind
  check (kind in ('shift', 'alert', 'reminder'));

alter table public.vendor_profiles
  add column if not exists stripe_account_id text;

create or replace function public.owns_vendor(vid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vendor_profiles
    where id = vid and user_id = auth.uid()
  );
$$;

revoke all on function public.owns_vendor(uuid) from public, anon;
grant execute on function public.owns_vendor(uuid) to authenticated;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  number integer not null,
  title text not null,
  amount_cents integer not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  constraint quotes_status check (status in ('draft', 'sent', 'accepted', 'invoiced')),
  constraint quotes_amount check (amount_cents >= 0),
  constraint quotes_title_len check (char_length(btrim(title)) between 2 and 160),
  unique (vendor_id, number)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  number integer not null,
  title text not null,
  amount_cents integer not null,
  status text not null default 'pending',
  due_on date,
  created_at timestamptz not null default now(),
  constraint invoices_status check (status in ('pending', 'paid')),
  constraint invoices_amount check (amount_cents >= 0),
  unique (vendor_id, number)
);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  amount_cents integer not null,
  due_on date not null,
  status text not null default 'pending',
  stripe_session_id text,
  created_at timestamptz not null default now(),
  constraint deposits_status check (status in ('pending', 'reminded', 'paid', 'cancelled')),
  constraint deposits_amount check (amount_cents > 0)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null,
  body text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint reviews_rating check (rating between 1 and 5),
  constraint reviews_status check (status in ('pending', 'published', 'rejected')),
  constraint reviews_body_len check (char_length(body) <= 2000),
  unique (wedding_id, vendor_id, author_id)
);

alter table public.quotes enable row level security;
alter table public.invoices enable row level security;
alter table public.deposits enable row level security;
alter table public.reviews enable row level security;

grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.deposits to authenticated;
grant select, insert, update on public.reviews to authenticated, anon;

create policy quotes_select on public.quotes
  for select to authenticated
  using (public.owns_vendor(vendor_id) or public.is_wedding_couple(wedding_id));
create policy quotes_write on public.quotes
  for all to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id));

create policy invoices_select on public.invoices
  for select to authenticated
  using (public.owns_vendor(vendor_id) or public.is_wedding_couple(wedding_id));
create policy invoices_write on public.invoices
  for all to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id));

create policy deposits_select on public.deposits
  for select to authenticated
  using (public.owns_vendor(vendor_id) or public.is_wedding_couple(wedding_id));
create policy deposits_write on public.deposits
  for all to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id));

create policy reviews_couple_select on public.reviews
  for select to authenticated
  using (public.is_wedding_couple(wedding_id) or public.owns_vendor(vendor_id));
create policy reviews_public_select on public.reviews
  for select to anon, authenticated
  using (status = 'published');
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'pending'
    and public.is_wedding_couple(wedding_id)
  );
create policy reviews_vendor_update on public.reviews
  for update to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id));

create or replace function public.run_deposit_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  row record;
  sent integer := 0;
begin
  for row in
    select d.id, d.wedding_id, d.amount_cents, d.due_on, v.user_id
    from public.deposits d
    join public.vendor_profiles v on v.id = d.vendor_id
    where d.status = 'pending'
      and d.due_on <= current_date + 3
  loop
    update public.deposits set status = 'reminded' where id = row.id;
    if exists (
      select 1 from public.wedding_members
      where wedding_id = row.wedding_id and member_role = 'couple'
    ) then
      insert into public.wedding_notifications (wedding_id, author_id, kind, body)
      values (
        row.wedding_id,
        row.user_id,
        'reminder',
        'Rappel : un acompte de ' || (row.amount_cents / 100) || ' € est dû le ' || to_char(row.due_on, 'DD/MM/YYYY') || '.'
      );
    end if;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

revoke all on function public.run_deposit_reminders() from public;
grant execute on function public.run_deposit_reminders() to anon, authenticated;
