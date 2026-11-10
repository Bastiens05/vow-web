-- VOW foundation schema.
-- Apply this file once, on an empty project, before any application data.
-- It creates tables, membership helpers, RLS, realtime for messages,
-- and the two Storage buckets (vendor-media, wedding-documents).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('vendor', 'couple');

create type public.vendor_category as enum (
  'photographer',
  'dj',
  'florist',
  'caterer',
  'venue',
  'planner',
  'beauty',
  'other'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_len check (char_length(full_name) <= 120),
  constraint profiles_email_len check (char_length(email) <= 320)
);

create table public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  category public.vendor_category not null,
  city text not null default '',
  zone text not null default '',
  description text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  website text not null default '',
  starting_price_cents integer,
  currency text not null default 'EUR',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_profiles_business_name_len check (char_length(business_name) between 2 and 120),
  constraint vendor_profiles_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint vendor_profiles_city_len check (char_length(city) <= 120),
  constraint vendor_profiles_zone_len check (char_length(zone) <= 160),
  constraint vendor_profiles_description_len check (char_length(description) <= 4000),
  constraint vendor_profiles_price_nonnegative check (
    starting_price_cents is null or starting_price_cents >= 0
  )
);

create table public.vendor_offers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  price_cents integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint vendor_offers_title_len check (char_length(title) between 2 and 120),
  constraint vendor_offers_description_len check (char_length(description) <= 1000),
  constraint vendor_offers_price_nonnegative check (price_cents is null or price_cents >= 0)
);

create table public.vendor_photos (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles (id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint vendor_photos_caption_len check (char_length(caption) <= 180),
  unique (vendor_id, storage_path)
);

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  partner_one_name text not null,
  partner_two_name text not null,
  wedding_date date not null,
  venue_name text not null default '',
  venue_city text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weddings_names_present check (
    char_length(btrim(partner_one_name)) > 0
    and char_length(btrim(partner_two_name)) > 0
  ),
  constraint weddings_name_len check (
    char_length(partner_one_name) <= 80
    and char_length(partner_two_name) <= 80
  ),
  constraint weddings_venue_len check (
    char_length(venue_name) <= 160
    and char_length(venue_city) <= 120
  )
);

create table public.wedding_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (wedding_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_role public.app_role not null,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invitations_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint invitations_token_format check (token ~ '^[0-9a-f]{64}$')
);

create unique index invitations_one_pending_email
  on public.invitations (wedding_id, email)
  where accepted_at is null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_len check (char_length(btrim(body)) between 1 and 2000)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now(),
  constraint documents_size_positive check (size_bytes > 0 and size_bytes <= 10485760),
  constraint documents_file_name_len check (char_length(file_name) between 1 and 180),
  unique (wedding_id, storage_path)
);

create table public.timeline_slots (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null,
  starts_at time not null,
  place text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timeline_title_len check (char_length(btrim(title)) between 1 and 120),
  constraint timeline_place_len check (char_length(place) <= 160),
  constraint timeline_notes_len check (char_length(notes) <= 1000)
);

create table public.timeline_comments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.timeline_slots (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint timeline_comments_body_len check (char_length(btrim(body)) between 1 and 1000)
);

create index weddings_date_idx on public.weddings (wedding_date);
create index wedding_members_user_idx on public.wedding_members (user_id);
create index messages_wedding_created_idx on public.messages (wedding_id, created_at);
create index documents_wedding_idx on public.documents (wedding_id, created_at);
create index timeline_slots_wedding_idx on public.timeline_slots (wedding_id, starts_at, sort_order);
create index invitations_wedding_idx on public.invitations (wedding_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Identifiant immuable';
  end if;
  if new.role is distinct from old.role then
    raise exception 'Le rôle du compte ne peut pas être modifié';
  end if;
  new.email := old.email;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_text text;
begin
  role_text := coalesce(new.raw_user_meta_data ->> 'role', 'couple');
  if role_text not in ('vendor', 'couple') then
    role_text := 'couple';
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    role_text::public.app_role,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    left(coalesce(new.email, ''), 320)
  );
  return new;
end;
$$;

create or replace function public.wedding_members_match_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role public.app_role;
begin
  select role into account_role from public.profiles where id = new.user_id;
  if account_role is null then
    raise exception 'Profil introuvable';
  end if;
  if account_role is distinct from new.member_role then
    raise exception 'Le rôle sur le mariage doit correspondre au type de compte';
  end if;
  return new;
end;
$$;

create or replace function public.weddings_creator_is_vendor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_role public.app_role;
begin
  select role into account_role from public.profiles where id = new.created_by;
  if account_role is distinct from 'vendor' then
    raise exception 'Seuls les prestataires peuvent créer un mariage';
  end if;
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

create trigger vendor_profiles_set_updated_at
  before update on public.vendor_profiles
  for each row execute function public.set_updated_at();

create trigger weddings_set_updated_at
  before update on public.weddings
  for each row execute function public.set_updated_at();

create trigger timeline_slots_set_updated_at
  before update on public.timeline_slots
  for each row execute function public.set_updated_at();

create trigger weddings_creator_is_vendor
  before insert on public.weddings
  for each row execute function public.weddings_creator_is_vendor();

create trigger wedding_members_match_account
  before insert or update on public.wedding_members
  for each row execute function public.wedding_members_match_account();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer: avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_wedding_member(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members
    where wedding_id = wid
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_wedding_vendor(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members
    where wedding_id = wid
      and user_id = auth.uid()
      and member_role = 'vendor'
  );
$$;

create or replace function public.storage_wedding_id(object_name text)
returns uuid
language sql
stable
set search_path = public, storage
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- Wedding RPCs. Direct inserts into weddings, members and invitations
-- are revoked from the API roles; these functions are the write path.
-- ---------------------------------------------------------------------------

create or replace function public.create_wedding(
  p_partner_one text,
  p_partner_two text,
  p_wedding_date date,
  p_venue_name text,
  p_venue_city text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  account_role public.app_role;
  wid uuid;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  select role into account_role from public.profiles where id = uid;
  if account_role is distinct from 'vendor' then
    raise exception 'Seuls les prestataires peuvent créer un mariage';
  end if;

  if char_length(btrim(coalesce(p_partner_one, ''))) < 2
    or char_length(btrim(coalesce(p_partner_two, ''))) < 2 then
    raise exception 'Indiquez les deux prénoms';
  end if;

  if p_wedding_date is null then
    raise exception 'Indiquez la date du mariage';
  end if;

  insert into public.weddings (
    created_by,
    partner_one_name,
    partner_two_name,
    wedding_date,
    venue_name,
    venue_city
  )
  values (
    uid,
    btrim(p_partner_one),
    btrim(p_partner_two),
    p_wedding_date,
    btrim(coalesce(p_venue_name, '')),
    btrim(coalesce(p_venue_city, ''))
  )
  returning id into wid;

  insert into public.wedding_members (wedding_id, user_id, member_role)
  values (wid, uid, 'vendor');

  return wid;
end;
$$;

create or replace function public.create_invitation(
  p_wedding_id uuid,
  p_email text,
  p_role public.app_role,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  if not public.is_wedding_vendor(p_wedding_id) then
    raise exception 'Seuls les prestataires du mariage peuvent inviter';
  end if;

  if p_role not in ('vendor', 'couple') then
    raise exception 'Rôle d''invitation invalide';
  end if;

  if p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Jeton d''invitation invalide';
  end if;

  normalized := lower(btrim(coalesce(p_email, '')));
  if normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide';
  end if;

  if exists (
    select 1 from public.profiles
    where id = uid and lower(email) = normalized
  ) then
    raise exception 'Vous ne pouvez pas vous inviter vous-même';
  end if;

  delete from public.invitations
  where wedding_id = p_wedding_id
    and email = normalized
    and accepted_at is null;

  insert into public.invitations (
    wedding_id,
    email,
    token,
    invited_role,
    invited_by,
    expires_at
  )
  values (
    p_wedding_id,
    normalized,
    p_token,
    p_role,
    uid,
    now() + interval '14 days'
  )
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'token', p_token);
end;
$$;

create or replace function public.preview_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invitations%rowtype;
  wedding public.weddings%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'missing');
  end if;

  select * into invite from public.invitations where token = p_token;
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  if invite.accepted_at is not null then
    return jsonb_build_object(
      'status', 'accepted',
      'wedding_id', invite.wedding_id,
      'role', invite.invited_role
    );
  end if;

  if invite.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select * into wedding from public.weddings where id = invite.wedding_id;

  return jsonb_build_object(
    'status', 'pending',
    'email', invite.email,
    'role', invite.invited_role,
    'wedding_id', invite.wedding_id,
    'partner_one', wedding.partner_one_name,
    'partner_two', wedding.partner_two_name,
    'wedding_date', wedding.wedding_date,
    'venue_name', wedding.venue_name,
    'venue_city', wedding.venue_city
  );
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  invite public.invitations%rowtype;
  user_email text;
  account_role public.app_role;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  select * into invite from public.invitations where token = p_token;
  if not found then
    raise exception 'Invitation introuvable';
  end if;

  if invite.accepted_at is not null then
    if invite.accepted_by = uid then
      return invite.wedding_id;
    end if;
    raise exception 'Cette invitation a déjà été utilisée';
  end if;

  if invite.expires_at <= now() then
    raise exception 'Cette invitation a expiré';
  end if;

  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if user_email = '' or user_email <> lower(invite.email) then
    raise exception 'Cette invitation est destinée à une autre adresse e-mail';
  end if;

  select role into account_role from public.profiles where id = uid;
  if account_role is null then
    raise exception 'Profil introuvable';
  end if;
  if account_role is distinct from invite.invited_role then
    raise exception 'Cette invitation ne correspond pas à votre type de compte';
  end if;

  insert into public.wedding_members (wedding_id, user_id, member_role)
  values (invite.wedding_id, uid, invite.invited_role)
  on conflict (wedding_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now(),
      accepted_by = uid
  where id = invite.id
    and accepted_at is null;

  return invite.wedding_id;
end;
$$;

revoke all on function public.is_wedding_member(uuid) from public, anon;
revoke all on function public.is_wedding_vendor(uuid) from public, anon;
revoke all on function public.storage_wedding_id(text) from public, anon;
revoke all on function public.create_wedding(text, text, date, text, text) from public, anon;
revoke all on function public.create_invitation(uuid, text, public.app_role, text) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.preview_invitation(text) from public;

grant execute on function public.is_wedding_member(uuid) to authenticated;
grant execute on function public.is_wedding_vendor(uuid) to authenticated;
grant execute on function public.storage_wedding_id(text) to authenticated;
grant execute on function public.create_wedding(text, text, date, text, text) to authenticated;
grant execute on function public.create_invitation(uuid, text, public.app_role, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.preview_invitation(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Grants. RLS below is the actual access control.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.vendor_profiles, public.vendor_offers, public.vendor_photos to anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.vendor_profiles to authenticated;
grant select, insert, update, delete on public.vendor_offers to authenticated;
grant select, insert, update, delete on public.vendor_photos to authenticated;
grant select, update, delete on public.weddings to authenticated;
grant select on public.wedding_members to authenticated;
grant select, delete on public.invitations to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select, insert, delete on public.documents to authenticated;
grant select, insert, update, delete on public.timeline_slots to authenticated;
grant select, insert, delete on public.timeline_comments to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.vendor_offers enable row level security;
alter table public.vendor_photos enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.invitations enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.timeline_slots enable row level security;
alter table public.timeline_comments enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.wedding_members me
      join public.wedding_members them on them.wedding_id = me.wedding_id
      where me.user_id = auth.uid()
        and them.user_id = profiles.id
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy vendor_profiles_owner on public.vendor_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'vendor'
    )
  );

create policy vendor_profiles_public_read on public.vendor_profiles
  for select to anon, authenticated
  using (published = true);

create policy vendor_offers_owner on public.vendor_offers
  for all to authenticated
  using (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_offers.vendor_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_offers.vendor_id and v.user_id = auth.uid()
    )
  );

create policy vendor_offers_public_read on public.vendor_offers
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_offers.vendor_id and v.published = true
    )
  );

create policy vendor_photos_owner on public.vendor_photos
  for all to authenticated
  using (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_photos.vendor_id and v.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_photos.vendor_id and v.user_id = auth.uid()
    )
  );

create policy vendor_photos_public_read on public.vendor_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.vendor_profiles v
      where v.id = vendor_photos.vendor_id and v.published = true
    )
  );

create policy weddings_select on public.weddings
  for select to authenticated
  using (public.is_wedding_member(id));

create policy weddings_update on public.weddings
  for update to authenticated
  using (public.is_wedding_vendor(id))
  with check (public.is_wedding_vendor(id));

create policy weddings_delete on public.weddings
  for delete to authenticated
  using (created_by = auth.uid());

create policy wedding_members_select on public.wedding_members
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy invitations_select on public.invitations
  for select to authenticated
  using (
    public.is_wedding_vendor(wedding_id)
    or (
      accepted_at is null
      and expires_at > now()
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy invitations_delete on public.invitations
  for delete to authenticated
  using (public.is_wedding_vendor(wedding_id) and accepted_at is null);

create policy messages_select on public.messages
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_wedding_member(wedding_id)
  );

create policy messages_delete on public.messages
  for delete to authenticated
  using (author_id = auth.uid());

create policy documents_select on public.documents
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_wedding_member(wedding_id)
  );

create policy documents_delete on public.documents
  for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.is_wedding_vendor(wedding_id)
  );

create policy timeline_slots_select on public.timeline_slots
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy timeline_slots_insert on public.timeline_slots
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_wedding_vendor(wedding_id)
  );

create policy timeline_slots_update on public.timeline_slots
  for update to authenticated
  using (public.is_wedding_vendor(wedding_id))
  with check (public.is_wedding_vendor(wedding_id));

create policy timeline_slots_delete on public.timeline_slots
  for delete to authenticated
  using (public.is_wedding_vendor(wedding_id));

create policy timeline_comments_select on public.timeline_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.timeline_slots s
      where s.id = timeline_comments.slot_id
        and public.is_wedding_member(s.wedding_id)
    )
  );

create policy timeline_comments_insert on public.timeline_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.timeline_slots s
      where s.id = timeline_comments.slot_id
        and public.is_wedding_member(s.wedding_id)
    )
  );

create policy timeline_comments_delete on public.timeline_comments
  for delete to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: one conversation per wedding
-- ---------------------------------------------------------------------------

alter table public.messages replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage buckets and policies
-- vendor-media is public so a published showcase can render without a service key.
-- Object names are unguessable. wedding-documents stays private.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('vendor-media', 'vendor-media', true),
  ('wedding-documents', 'wedding-documents', false)
on conflict (id) do update
set public = excluded.public;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'file_size_limit'
  ) then
    update storage.buckets set file_size_limit = 8388608 where id = 'vendor-media';
    update storage.buckets set file_size_limit = 10485760 where id = 'wedding-documents';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'allowed_mime_types'
  ) then
    update storage.buckets
      set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
      where id = 'vendor-media';
    update storage.buckets
      set allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      where id = 'wedding-documents';
  end if;
end $$;

create policy vendor_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vendor-media');

create policy vendor_media_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy vendor_media_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vendor-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'vendor-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy vendor_media_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vendor-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy wedding_documents_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wedding-documents'
    and public.is_wedding_member(public.storage_wedding_id(name))
  );

create policy wedding_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wedding-documents'
    and public.is_wedding_member(public.storage_wedding_id(name))
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy wedding_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wedding-documents'
    and public.is_wedding_member(public.storage_wedding_id(name))
    and (
      public.is_wedding_vendor(public.storage_wedding_id(name))
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Fail the migration if a public table was added without RLS.
do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false;

  if missing is not null then
    raise exception 'RLS manquant sur: %', missing;
  end if;
end $$;
