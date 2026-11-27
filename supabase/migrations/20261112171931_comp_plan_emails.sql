-- Formules offertes par e-mail, sur le modèle de admin_emails.
-- Aucun accès client : RLS activé, sans politique ni grant.

create table public.comp_plan_emails (
  email text primary key,
  plan text not null,
  constraint comp_plan_emails_format check (email = lower(email) and position('@' in email) > 1),
  constraint comp_plan_emails_plan check (plan in ('essentiel', 'pro', 'studio'))
);

insert into public.comp_plan_emails (email, plan)
values ('contact@bastiensellier.com', 'studio');

alter table public.vendor_billing
  add column if not exists comped boolean not null default false;

alter table public.comp_plan_emails enable row level security;

revoke all on table public.comp_plan_emails from public, anon, authenticated;

create or replace function public.apply_comp_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  granted text;
begin
  select c.plan into granted
  from public.comp_plan_emails c
  join public.vendor_profiles v on v.id = new.vendor_id
  join public.profiles p on p.id = v.user_id
  where c.email = lower(p.email);
  if granted is not null then
    new.plan := granted;
    new.status := 'active';
    new.comped := true;
    new.tester_until := null;
  end if;
  return new;
end;
$$;

drop trigger if exists vendor_billing_apply_comp on public.vendor_billing;
create trigger vendor_billing_apply_comp
  before insert or update on public.vendor_billing
  for each row execute function public.apply_comp_plan();

create or replace function public.choose_vendor_plan(p_plan text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  vid uuid;
  chosen text;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  if p_plan is null or p_plan not in ('essentiel', 'pro', 'studio') then
    raise exception 'Formule inconnue';
  end if;
  select id into vid from public.vendor_profiles where user_id = uid;
  if vid is null then
    raise exception 'Réservé aux prestataires';
  end if;
  update public.vendor_billing
    set plan = p_plan
    where vendor_id = vid;
  if not found then
    raise exception 'Abonnement introuvable';
  end if;
  select plan into chosen from public.vendor_billing where vendor_id = vid;
  return chosen;
end;
$$;

revoke all on function public.apply_comp_plan() from public, anon, authenticated;
revoke all on function public.choose_vendor_plan(text) from public, anon;
grant execute on function public.choose_vendor_plan(text) to authenticated;
