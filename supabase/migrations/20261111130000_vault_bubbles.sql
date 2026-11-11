-- Coffre des mariés, partages vers un prestataire, et annulation d'un décalage du jour J.
-- Ne pas appliquer sur le projet hébergé depuis cet outil.

create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  label text not null,
  storage_path text,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now(),
  constraint vault_items_kind_len check (char_length(kind) between 1 and 40),
  constraint vault_items_label_len check (char_length(label) between 1 and 120)
);

create table public.vault_shares (
  item_id uuid not null references public.vault_items (id) on delete cascade,
  vendor_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, vendor_user_id)
);

alter table public.vault_items enable row level security;
alter table public.vault_shares enable row level security;

grant select, insert, update, delete on public.vault_items to authenticated;
grant select, insert, delete on public.vault_shares to authenticated;

create policy vault_items_couple on public.vault_items
  for all to authenticated
  using (public.is_wedding_couple(wedding_id))
  with check (public.is_wedding_couple(wedding_id) and owner_id = auth.uid());

create policy vault_items_vendor_read on public.vault_items
  for select to authenticated
  using (
    exists (
      select 1 from public.vault_shares s
      where s.item_id = vault_items.id and s.vendor_user_id = auth.uid()
    )
  );

create policy vault_shares_couple on public.vault_shares
  for all to authenticated
  using (
    exists (
      select 1 from public.vault_items i
      where i.id = item_id and public.is_wedding_couple(i.wedding_id)
    )
  )
  with check (
    exists (
      select 1 from public.vault_items i
      where i.id = item_id and public.is_wedding_couple(i.wedding_id)
    )
  );

create policy vault_shares_vendor_read on public.vault_shares
  for select to authenticated
  using (vendor_user_id = auth.uid());

create or replace function public.undo_timeline_shift(
  p_slot_id uuid,
  p_previous_time time,
  p_notification_id uuid,
  p_cascade boolean,
  p_minutes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  slot public.timeline_slots%rowtype;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select * into slot from public.timeline_slots where id = p_slot_id;
  if not found then
    raise exception 'Moment introuvable';
  end if;
  if not public.is_wedding_couple(slot.wedding_id) then
    raise exception 'Seul le couple peut annuler un décalage';
  end if;
  if p_cascade and p_minutes <> 0 then
    update public.timeline_slots
    set starts_at = starts_at - make_interval(mins => p_minutes)
    where wedding_id = slot.wedding_id
      and id <> slot.id
      and starts_at >= slot.starts_at;
  end if;
  update public.timeline_slots set starts_at = p_previous_time where id = slot.id;
  delete from public.wedding_notifications
  where id = p_notification_id and wedding_id = slot.wedding_id and author_id = uid;
end;
$$;

revoke all on function public.undo_timeline_shift(uuid, time, uuid, boolean, integer) from public, anon;
grant execute on function public.undo_timeline_shift(uuid, time, uuid, boolean, integer) to authenticated;
