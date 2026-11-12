-- One send per vendor the evening before the wedding.

create table public.brief_sends (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_on date not null,
  primary key (wedding_id, user_id, sent_on)
);

alter table public.brief_sends enable row level security;
grant select on public.brief_sends to authenticated;

create policy brief_sends_read on public.brief_sends
  for select to authenticated
  using (user_id = auth.uid() or public.is_wedding_couple(wedding_id));

create or replace function public.due_day_briefs(p_day date)
returns table (wedding_id uuid, user_id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, m.user_id, p.email
  from public.weddings w
  join public.wedding_members m on m.wedding_id = w.id and m.member_role = 'vendor'
  join public.profiles p on p.id = m.user_id
  where w.wedding_date = p_day
    and w.is_demo = false
    and not exists (
      select 1 from public.brief_sends s
      where s.wedding_id = w.id and s.user_id = m.user_id and s.sent_on = p_day
    );
$$;

create or replace function public.mark_brief_sent(p_wedding uuid, p_user uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.brief_sends (wedding_id, user_id, sent_on)
  values (p_wedding, p_user, p_day)
  on conflict do nothing;
end;
$$;

revoke all on function public.due_day_briefs(date) from public, anon;
revoke all on function public.mark_brief_sent(uuid, uuid, date) from public, anon;
grant execute on function public.due_day_briefs(date) to anon, authenticated;
grant execute on function public.mark_brief_sent(uuid, uuid, date) to anon, authenticated;
