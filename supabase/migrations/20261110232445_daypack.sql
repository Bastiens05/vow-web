-- Questionnaires, map stops, directory opt-in and gallery.
-- Apply after 20261110233000_shell.sql. Independent of the ledger migration.

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

alter table public.vendor_profiles
  add column if not exists share_phone boolean not null default false,
  add column if not exists share_email boolean not null default false;

create or replace function public.can_manage_gallery(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendor_profiles v
    join public.wedding_members m
      on m.user_id = v.user_id
     and m.wedding_id = wid
     and m.member_role = 'vendor'
    where v.user_id = auth.uid()
      and v.category in ('photographer', 'videographer')
  );
$$;

create or replace function public.can_read_gallery(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_wedding_couple(wid) or public.can_manage_gallery(wid);
$$;

revoke all on function public.can_manage_gallery(uuid) from public, anon;
revoke all on function public.can_read_gallery(uuid) from public, anon;
grant execute on function public.can_manage_gallery(uuid) to authenticated;
grant execute on function public.can_read_gallery(uuid) to authenticated;

create table if not exists public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  title text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  constraint questionnaires_status check (status in ('draft', 'sent', 'answered')),
  constraint questionnaires_title_len check (char_length(btrim(title)) between 2 and 120),
  unique (wedding_id, vendor_id)
);

create table if not exists public.questionnaire_items (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires (id) on delete cascade,
  prompt text not null,
  answer text not null default '',
  sort_order integer not null default 0,
  constraint questionnaire_items_prompt_len check (char_length(btrim(prompt)) between 2 and 240),
  constraint questionnaire_items_answer_len check (char_length(answer) <= 2000)
);

create table if not exists public.wedding_stops (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  label text not null,
  address text not null,
  starts_at time,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint wedding_stops_label_len check (char_length(btrim(label)) between 2 and 80),
  constraint wedding_stops_address_len check (char_length(btrim(address)) between 4 and 240)
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  title text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint deliveries_title_len check (char_length(btrim(title)) between 2 and 120)
);

create table if not exists public.delivery_files (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint delivery_files_size check (size_bytes > 0 and size_bytes <= 52428800),
  constraint delivery_files_name_len check (char_length(file_name) between 1 and 180)
);

alter table public.questionnaires enable row level security;
alter table public.questionnaire_items enable row level security;
alter table public.wedding_stops enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_files enable row level security;

grant select, insert, update, delete on public.questionnaires to authenticated;
grant select, insert, update, delete on public.questionnaire_items to authenticated;
grant select, insert, update, delete on public.wedding_stops to authenticated;
grant select, insert, delete on public.deliveries to authenticated;
grant select, insert, delete on public.delivery_files to authenticated;

drop policy if exists questionnaires_select on public.questionnaires;
drop policy if exists questionnaires_write on public.questionnaires;
drop policy if exists questionnaires_couple_update on public.questionnaires;
drop policy if exists questionnaire_items_select on public.questionnaire_items;
drop policy if exists questionnaire_items_write on public.questionnaire_items;
drop policy if exists questionnaire_items_answer on public.questionnaire_items;
drop policy if exists wedding_stops_select on public.wedding_stops;
drop policy if exists wedding_stops_write on public.wedding_stops;
drop policy if exists deliveries_select on public.deliveries;
drop policy if exists deliveries_write on public.deliveries;
drop policy if exists delivery_files_select on public.delivery_files;
drop policy if exists delivery_files_write on public.delivery_files;

create policy questionnaires_select on public.questionnaires
  for select to authenticated
  using (
    public.owns_vendor(vendor_id)
    or (public.is_wedding_couple(wedding_id) and status in ('sent', 'answered'))
  );

create policy questionnaires_write on public.questionnaires
  for all to authenticated
  using (public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id))
  with check (public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id));

create policy questionnaires_couple_update on public.questionnaires
  for update to authenticated
  using (public.is_wedding_couple(wedding_id) and status in ('sent', 'answered'))
  with check (public.is_wedding_couple(wedding_id) and status = 'answered');

create policy questionnaire_items_select on public.questionnaire_items
  for select to authenticated
  using (
    exists (
      select 1 from public.questionnaires q
      where q.id = questionnaire_id
        and (
          public.owns_vendor(q.vendor_id)
          or (public.is_wedding_couple(q.wedding_id) and q.status in ('sent', 'answered'))
        )
    )
  );

create policy questionnaire_items_write on public.questionnaire_items
  for all to authenticated
  using (
    exists (
      select 1 from public.questionnaires q
      where q.id = questionnaire_id
        and public.owns_vendor(q.vendor_id)
        and public.is_wedding_vendor(q.wedding_id)
    )
  )
  with check (
    exists (
      select 1 from public.questionnaires q
      where q.id = questionnaire_id
        and public.owns_vendor(q.vendor_id)
        and public.is_wedding_vendor(q.wedding_id)
    )
  );

create policy questionnaire_items_answer on public.questionnaire_items
  for update to authenticated
  using (
    exists (
      select 1 from public.questionnaires q
      where q.id = questionnaire_id
        and public.is_wedding_couple(q.wedding_id)
        and q.status in ('sent', 'answered')
    )
  )
  with check (
    char_length(answer) <= 2000
    and exists (
      select 1 from public.questionnaires q
      where q.id = questionnaire_id
        and public.is_wedding_couple(q.wedding_id)
        and q.status in ('sent', 'answered')
    )
  );

create or replace function public.guard_questionnaire_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select vendor_id into owner from public.questionnaires where id = new.questionnaire_id;
  if not public.owns_vendor(owner) then
    new.prompt := old.prompt;
    new.sort_order := old.sort_order;
    new.questionnaire_id := old.questionnaire_id;
  end if;
  return new;
end;
$$;

drop trigger if exists questionnaire_items_guard on public.questionnaire_items;
create trigger questionnaire_items_guard
  before update on public.questionnaire_items
  for each row execute function public.guard_questionnaire_item();

create or replace function public.guard_questionnaire()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.owns_vendor(old.vendor_id) then
    new.title := old.title;
    new.vendor_id := old.vendor_id;
    new.wedding_id := old.wedding_id;
    if new.status is distinct from 'answered' then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists questionnaires_guard on public.questionnaires;
create trigger questionnaires_guard
  before update on public.questionnaires
  for each row execute function public.guard_questionnaire();

create policy wedding_stops_select on public.wedding_stops
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy wedding_stops_write on public.wedding_stops
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id));

create policy deliveries_select on public.deliveries
  for select to authenticated
  using (public.can_read_gallery(wedding_id));

create policy deliveries_write on public.deliveries
  for all to authenticated
  using (public.can_manage_gallery(wedding_id) and public.owns_vendor(vendor_id))
  with check (public.can_manage_gallery(wedding_id) and public.owns_vendor(vendor_id) and public.is_wedding_vendor(wedding_id));

create policy delivery_files_select on public.delivery_files
  for select to authenticated
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id and public.can_read_gallery(d.wedding_id)
    )
  );

create policy delivery_files_write on public.delivery_files
  for all to authenticated
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id
        and public.can_manage_gallery(d.wedding_id)
        and public.owns_vendor(d.vendor_id)
    )
  )
  with check (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_id
        and public.can_manage_gallery(d.wedding_id)
        and public.owns_vendor(d.vendor_id)
    )
  );

create or replace function public.wedding_directory(p_wedding_id uuid)
returns table (
  user_id uuid,
  member_role text,
  full_name text,
  business_name text,
  category text,
  phone text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.user_id,
    m.member_role::text,
    p.full_name,
    v.business_name,
    v.category::text,
    case
      when coalesce(v.share_phone, false) and btrim(coalesce(v.contact_phone, '')) <> '' then v.contact_phone
      else null
    end,
    case
      when coalesce(v.share_email, false) and btrim(coalesce(v.contact_email, '')) <> '' then v.contact_email
      else null
    end
  from public.wedding_members m
  join public.profiles p on p.id = m.user_id
  left join public.vendor_profiles v on v.user_id = m.user_id and m.member_role = 'vendor'
  where m.wedding_id = p_wedding_id
    and public.is_wedding_member(p_wedding_id);
$$;

revoke all on function public.wedding_directory(uuid) from public, anon;
grant execute on function public.wedding_directory(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('wedding-gallery', 'wedding-gallery', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800;

drop policy if exists wedding_gallery_select on storage.objects;
drop policy if exists wedding_gallery_insert on storage.objects;
drop policy if exists wedding_gallery_delete on storage.objects;

create policy wedding_gallery_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-gallery'
    and public.can_read_gallery(public.storage_wedding_id(name))
  );

create policy wedding_gallery_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wedding-gallery'
    and public.can_manage_gallery(public.storage_wedding_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy wedding_gallery_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wedding-gallery'
    and public.can_manage_gallery(public.storage_wedding_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  );
