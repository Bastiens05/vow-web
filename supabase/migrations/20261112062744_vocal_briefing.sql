create table public.wedding_briefings (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  pronunciation_note text not null default '',
  key_people text not null default ''
);

create table public.vendor_brief_notes (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  note text not null default '',
  primary key (wedding_id, vendor_id)
);

create table public.briefing_listens (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  listened_at timestamptz not null default now()
);

alter table public.wedding_briefings enable row level security;
alter table public.vendor_brief_notes enable row level security;
alter table public.briefing_listens enable row level security;

grant select, insert, update, delete on public.wedding_briefings to authenticated;
grant select, insert, update, delete on public.vendor_brief_notes to authenticated;
grant select, insert on public.briefing_listens to authenticated;

create policy wedding_briefings_read on public.wedding_briefings
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy wedding_briefings_couple on public.wedding_briefings
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy vendor_brief_notes_couple on public.vendor_brief_notes
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy vendor_brief_notes_vendor on public.vendor_brief_notes
  for select to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy briefing_listens_own on public.briefing_listens
  for select to authenticated
  using (user_id = auth.uid());

create policy briefing_listens_insert on public.briefing_listens
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_wedding_member(wedding_id));
