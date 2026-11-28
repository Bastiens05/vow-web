create table public.delivery_tracks (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  promised_on date not null,
  step_index integer not null default 0,
  note text not null default '',
  file_url text not null default '',
  primary key (wedding_id, vendor_id),
  constraint delivery_step_index check (step_index >= 0)
);

alter table public.delivery_tracks enable row level security;
grant select, insert, update, delete on public.delivery_tracks to authenticated;

create policy delivery_tracks_vendor on public.delivery_tracks
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy delivery_tracks_couple on public.delivery_tracks
  for select to authenticated
  using (public.is_wedding_couple(wedding_id));
