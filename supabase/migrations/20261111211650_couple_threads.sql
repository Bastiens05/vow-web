-- Couple space: the wedding's vendor stays a member, messages are one thread per vendor,
-- and a couple can invite their partner into the same wedding.

insert into public.wedding_members (wedding_id, user_id, member_role)
select w.id, w.created_by, 'vendor'
from public.weddings w
join public.profiles p on p.id = w.created_by and p.role = 'vendor'
where not exists (
  select 1 from public.wedding_members m
  where m.wedding_id = w.id and m.user_id = w.created_by
)
on conflict (wedding_id, user_id) do nothing;

create or replace function public.ensure_vendor_host()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wedding_members (wedding_id, user_id, member_role)
  select w.id, w.created_by, 'vendor'
  from public.weddings w
  join public.profiles p on p.id = w.created_by and p.role = 'vendor'
  where w.id = new.wedding_id
  on conflict (wedding_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists wedding_members_ensure_host on public.wedding_members;
create trigger wedding_members_ensure_host
  after insert on public.wedding_members
  for each row execute function public.ensure_vendor_host();

alter table public.messages
  add column if not exists vendor_user_id uuid references public.profiles (id) on delete cascade;

update public.messages m
set vendor_user_id = coalesce(
  (
    select wm.user_id from public.wedding_members wm
    where wm.wedding_id = m.wedding_id and wm.user_id = m.author_id and wm.member_role = 'vendor'
    limit 1
  ),
  (
    select wm.user_id from public.wedding_members wm
    where wm.wedding_id = m.wedding_id and wm.member_role = 'vendor'
    order by wm.created_at
    limit 1
  )
)
where m.vendor_user_id is null;

create index if not exists messages_thread_idx on public.messages (wedding_id, vendor_user_id, created_at);

drop policy if exists messages_select on public.messages;
drop policy if exists messages_staff_select on public.messages;
drop policy if exists messages_insert on public.messages;
drop policy if exists messages_staff_insert on public.messages;

create policy messages_select on public.messages
  for select to authenticated
  using (
    public.is_wedding_couple(wedding_id)
    or (
      vendor_user_id = auth.uid()
      and (public.is_wedding_vendor(wedding_id) or public.is_wedding_staff(wedding_id))
    )
  );

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and vendor_user_id is not null
    and (
      (
        public.is_wedding_couple(wedding_id)
        and exists (
          select 1 from public.wedding_members host
          where host.wedding_id = messages.wedding_id
            and host.user_id = vendor_user_id
            and host.member_role = 'vendor'
        )
      )
      or (
        vendor_user_id = auth.uid()
        and (public.is_wedding_vendor(wedding_id) or public.is_wedding_staff(wedding_id))
      )
    )
  );

create or replace function public.messages_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (new.wedding_id, new.author_id, 'alert', left('Message : ' || btrim(new.body), 180));
  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.messages_notify();

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
  couple_host boolean;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;

  couple_host := public.is_wedding_couple(p_wedding_id);
  if public.is_wedding_vendor(p_wedding_id) then
    null;
  elsif couple_host and p_role = 'couple' then
    null;
  else
    raise exception 'Invitation non autorisée';
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
    wedding_id, email, token, invited_role, invited_by, expires_at
  )
  values (
    p_wedding_id, normalized, p_token, p_role, uid, now() + interval '14 days'
  )
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'token', p_token);
end;
$$;

create policy invitations_couple_select on public.invitations
  for select to authenticated
  using (public.is_wedding_couple(wedding_id) and invited_role = 'couple');

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
      when public.is_wedding_couple(p_wedding_id) and btrim(coalesce(v.contact_phone, '')) <> '' then v.contact_phone
      when coalesce(v.share_phone, false) and btrim(coalesce(v.contact_phone, '')) <> '' then v.contact_phone
      else null
    end,
    case
      when public.is_wedding_couple(p_wedding_id) then coalesce(nullif(btrim(v.contact_email), ''), nullif(btrim(p.email), ''))
      when coalesce(v.share_email, false) and btrim(coalesce(v.contact_email, '')) <> '' then v.contact_email
      else null
    end
  from public.wedding_members m
  join public.profiles p on p.id = m.user_id
  left join public.vendor_profiles v on v.user_id = m.user_id and m.member_role = 'vendor'
  where m.wedding_id = p_wedding_id
    and (public.is_wedding_member(p_wedding_id) or public.is_wedding_staff(p_wedding_id));
$$;
