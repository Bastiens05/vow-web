-- The couple can read an invoice, but not an unpublished vendor profile.
-- This maps the invoice's vendor id to the member, only for a wedding they belong to as a couple.
-- create or replace only. Safe to run again.

create or replace function public.wedding_invoice_vendors(p_wedding uuid)
returns table (vendor_id uuid, user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.user_id
  from public.wedding_members m
  join public.vendor_profiles v on v.user_id = m.user_id
  where m.wedding_id = p_wedding
    and m.member_role = 'vendor'
    and public.is_wedding_couple(p_wedding);
$$;

revoke all on function public.wedding_invoice_vendors(uuid) from public, anon;
grant execute on function public.wedding_invoice_vendors(uuid) to authenticated;
