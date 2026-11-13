-- A conversation stays unread until the current user opens it.
-- Reads are per user, so one partner opening a thread does not clear it for the other.

alter table public.wedding_notifications
  add column if not exists message_id uuid references public.messages (id) on delete cascade;

create index if not exists wedding_notifications_message_idx
  on public.wedding_notifications (message_id);

create table public.message_reads (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index message_reads_user_idx on public.message_reads (user_id, message_id);

alter table public.message_reads enable row level security;
revoke all on table public.message_reads from public, anon;
grant select, insert on table public.message_reads to authenticated;

create policy message_reads_select on public.message_reads
  for select to authenticated
  using (user_id = auth.uid());

create policy message_reads_insert on public.message_reads
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and (
          public.is_wedding_couple(m.wedding_id)
          or (
            m.vendor_user_id = auth.uid()
            and (public.is_wedding_vendor(m.wedding_id) or public.is_wedding_staff(m.wedding_id))
          )
        )
    )
  );

alter table public.message_reads replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reads'
    ) then
      alter publication supabase_realtime add table public.message_reads;
    end if;
  end if;
end $$;

create or replace function public.messages_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender text;
begin
  select nullif(btrim(full_name), '') into sender
  from public.profiles
  where id = new.author_id;
  insert into public.wedding_notifications (wedding_id, author_id, kind, body, message_id)
  values (
    new.wedding_id,
    new.author_id,
    'message',
    left(coalesce(sender, 'Quelqu''un') || ' : ' || btrim(new.body), 180),
    new.id
  );
  return new;
end;
$$;

update public.wedding_notifications n
set message_id = m.id
from public.messages m
join public.profiles p on p.id = m.author_id
where n.message_id is null
  and n.wedding_id = m.wedding_id
  and n.author_id = m.author_id
  and n.created_at between m.created_at - interval '5 seconds' and m.created_at + interval '5 seconds'
  and (
    n.body = left(coalesce(nullif(btrim(p.full_name), ''), 'Quelqu''un') || ' : ' || btrim(m.body), 180)
    or n.body = left('Message : ' || btrim(m.body), 180)
  );

create or replace function public.unread_message_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.messages m
  where m.author_id is distinct from auth.uid()
    and not exists (
      select 1
      from public.message_reads r
      where r.message_id = m.id
        and r.user_id = auth.uid()
    );
$$;

revoke all on function public.unread_message_count() from public, anon;
grant execute on function public.unread_message_count() to authenticated;
