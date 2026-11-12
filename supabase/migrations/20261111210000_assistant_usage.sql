-- Daily counter for Assistant VOW. No prompt or reply is stored.
-- Apply after 20261111130000_vault_bubbles.sql. Does not modify existing tables.

create table public.assistant_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_day date not null,
  message_count integer not null default 0,
  primary key (user_id, usage_day),
  constraint assistant_usage_count check (message_count between 0 and 200)
);

alter table public.assistant_usage enable row level security;
revoke all on public.assistant_usage from public, anon, authenticated;

create or replace function public.consume_assistant_turn(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (timezone('Europe/Paris', now()))::date;
  next_count integer;
begin
  if uid is null then
    return -1;
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    p_limit := 30;
  end if;
  insert into public.assistant_usage as usage (user_id, usage_day, message_count)
  values (uid, today, 1)
  on conflict (user_id, usage_day)
  do update set message_count = usage.message_count + 1
  where usage.message_count < p_limit
  returning message_count into next_count;
  if next_count is null then
    return -1;
  end if;
  return p_limit - next_count;
end;
$$;

revoke all on function public.consume_assistant_turn(integer) from public, anon;
grant execute on function public.consume_assistant_turn(integer) to authenticated;
