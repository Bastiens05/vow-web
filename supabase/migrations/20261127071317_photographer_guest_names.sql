-- The photographer of a wedding may read guest names only.
-- No table, no diet, no note, no contact. create or replace only. Safe to run again.

create or replace function public.wedding_guest_names(p_wedding uuid)
returns table (full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select btrim(g.full_name)
  from public.guests g
  where g.wedding_id = p_wedding
    and btrim(g.full_name) <> ''
    and exists (
      select 1
      from public.wedding_members m
      join public.vendor_profiles v on v.user_id = m.user_id
      where m.wedding_id = p_wedding
        and m.user_id = auth.uid()
        and m.member_role = 'vendor'
        and v.category::text = 'photographer'
    )
  order by g.sort_order, g.created_at;
$$;

revoke all on function public.wedding_guest_names(uuid) from public, anon;
grant execute on function public.wedding_guest_names(uuid) to authenticated;
