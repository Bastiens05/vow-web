create table public.tech_templates (
  vendor_id uuid primary key references public.vendor_profiles (id) on delete cascade,
  fields jsonb not null default '{}'::jsonb
);

create table public.wedding_tech (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  fields jsonb not null default '{}'::jsonb,
  primary key (wedding_id, vendor_id)
);

create table public.venue_capabilities (
  wedding_id uuid primary key references public.weddings (id) on delete cascade,
  fields jsonb not null default '{}'::jsonb,
  share_with_couple boolean not null default false
);

create table public.tech_issues (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  code text not null,
  message text not null,
  vendor_ids uuid[] not null default '{}'
);

alter table public.tech_templates enable row level security;
alter table public.wedding_tech enable row level security;
alter table public.venue_capabilities enable row level security;
alter table public.tech_issues enable row level security;

grant select, insert, update, delete on public.tech_templates to authenticated;
grant select, insert, update, delete on public.wedding_tech to authenticated;
grant select, insert, update, delete on public.venue_capabilities to authenticated;
grant select, insert, delete on public.tech_issues to authenticated;

create policy tech_templates_owner on public.tech_templates
  for all to authenticated
  using (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()))
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy wedding_tech_vendor on public.wedding_tech
  for all to authenticated
  using (
    exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid())
    or public.is_wedding_couple(wedding_id)
  )
  with check (exists (select 1 from public.vendor_profiles v where v.id = vendor_id and v.user_id = auth.uid()));

create policy venue_capabilities_members on public.venue_capabilities
  for select to authenticated
  using (
    public.is_wedding_member(wedding_id)
    and (share_with_couple or not public.is_wedding_couple(wedding_id) or share_with_couple)
  );

create policy venue_capabilities_write on public.venue_capabilities
  for all to authenticated
  using (public.is_wedding_couple(wedding_id) or exists (select 1 from public.wedding_members m join public.vendor_profiles v on v.user_id = m.user_id where m.wedding_id = venue_capabilities.wedding_id and v.user_id = auth.uid() and v.category in ('venue', 'planner')))
  with check (public.is_wedding_couple(wedding_id) or exists (select 1 from public.wedding_members m join public.vendor_profiles v on v.user_id = m.user_id where m.wedding_id = venue_capabilities.wedding_id and v.user_id = auth.uid() and v.category in ('venue', 'planner')));

create policy tech_issues_involved on public.tech_issues
  for select to authenticated
  using (
    public.is_wedding_member(wedding_id)
    and (
      auth.uid() = any (vendor_ids)
      or exists (select 1 from public.vendor_profiles v where v.user_id = auth.uid() and v.category = 'planner' and exists (select 1 from public.wedding_members m where m.wedding_id = tech_issues.wedding_id and m.user_id = auth.uid()))
      or (public.is_wedding_couple(wedding_id) and exists (select 1 from public.venue_capabilities c where c.wedding_id = tech_issues.wedding_id and c.share_with_couple))
    )
  );
