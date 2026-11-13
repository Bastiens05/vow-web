-- Already applied in production. Recreates the signup notice helpers
-- so the trade cast is explicit and the search path is pinned.

create or replace function public.signup_notice_body(p_role text, p_email text, p_trade text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  trade_label text;
begin
  if p_role = 'vendor' then
    trade_label := public.vendor_trade_label(p_trade);
    if trade_label is not null then
      return left('Nouveau compte prestataire : ' || p_email || ' · ' || trade_label, 500);
    end if;
    return left('Nouveau compte prestataire : ' || p_email, 500);
  end if;
  return left('Nouveau compte mariés : ' || p_email, 500);
end;
$$;

create or replace function public.refresh_signup_notice_trade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.admin_notices n
    set body = public.signup_notice_body('vendor'::text, p.email, new.category::text)
    from public.profiles p
    where n.profile_id = new.user_id
      and p.id = new.user_id;
  return new;
end;
$$;

drop trigger if exists vendor_profiles_refresh_signup_notice on public.vendor_profiles;
create trigger vendor_profiles_refresh_signup_notice
  after insert on public.vendor_profiles
  for each row execute function public.refresh_signup_notice_trade();
