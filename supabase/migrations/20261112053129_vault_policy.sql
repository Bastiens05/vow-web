-- The vendor read of vault_items looked at vault_shares, whose couple policy
-- looked back at vault_items. Postgres then reported infinite recursion and
-- the coffre stayed empty. The couple check now runs as the definer.

create or replace function public.vault_item_for_couple(p_item uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vault_items
    where id = p_item and public.is_wedding_couple(wedding_id)
  );
$$;

revoke all on function public.vault_item_for_couple(uuid) from public, anon;
grant execute on function public.vault_item_for_couple(uuid) to authenticated;

drop policy if exists vault_shares_couple on public.vault_shares;
create policy vault_shares_couple on public.vault_shares
  for all to authenticated
  using (public.vault_item_for_couple(item_id))
  with check (public.vault_item_for_couple(item_id));
