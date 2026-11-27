-- Photo groups are composed by the couple and the planner.
-- Photographers and videographers keep the list, and stamp called_at only
-- through mark_photo_group_called.

create or replace function public.can_compose_photo_groups(wid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_wedding_couple(wid)
    or exists (
      select 1
      from public.wedding_members m
      join public.vendor_profiles v on v.user_id = m.user_id
      where m.wedding_id = wid
        and m.user_id = auth.uid()
        and v.category = 'planner'
    );
$$;

revoke all on function public.can_compose_photo_groups(uuid) from public, anon;
grant execute on function public.can_compose_photo_groups(uuid) to authenticated;

drop policy if exists photo_groups_insert on public.photo_groups;
drop policy if exists photo_groups_update on public.photo_groups;
drop policy if exists photo_groups_delete on public.photo_groups;

create policy photo_groups_insert on public.photo_groups
  for insert to authenticated
  with check (public.can_compose_photo_groups(wedding_id));

create policy photo_groups_update on public.photo_groups
  for update to authenticated
  using (public.can_compose_photo_groups(wedding_id))
  with check (public.can_compose_photo_groups(wedding_id));

create policy photo_groups_delete on public.photo_groups
  for delete to authenticated
  using (public.can_compose_photo_groups(wedding_id));

create or replace function public.mark_photo_group_called(p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
  cat text;
begin
  select wedding_id into wid from public.photo_groups where id = p_group;
  if wid is null then
    raise exception 'Groupe introuvable';
  end if;

  if not public.is_wedding_couple(wid) then
    select v.category::text into cat
    from public.vendor_profiles v
    join public.wedding_members m on m.user_id = v.user_id and m.wedding_id = wid
    where v.user_id = auth.uid();
    if cat is null or cat not in ('photographer', 'videographer', 'planner') then
      raise exception 'Réservé au photographe';
    end if;
  end if;

  update public.photo_groups
  set called_at = now()
  where id = p_group
    and wedding_id = wid
    and called_at is null;
end;
$$;

revoke all on function public.mark_photo_group_called(uuid) from public, anon;
grant execute on function public.mark_photo_group_called(uuid) to authenticated;
