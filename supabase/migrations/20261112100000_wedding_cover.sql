-- Cover photo chosen by a couple or a vendor. The file itself stays in the
-- existing private wedding-documents bucket, under the member's own folder,
-- so the current storage policies apply without a new one.

alter table public.weddings
  add column if not exists cover_path text;

alter table public.weddings
  drop constraint if exists weddings_cover_path_len;

alter table public.weddings
  add constraint weddings_cover_path_len check (cover_path is null or char_length(cover_path) between 1 and 240);

create or replace function public.set_wedding_cover(p_wedding uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_wedding_member(p_wedding) then
    raise exception 'not a member';
  end if;
  if p_path is not null and p_path !~ (
    '^' || p_wedding::text || '/' || auth.uid()::text || '/cover-[A-Za-z0-9._-]+$'
  ) then
    raise exception 'invalid cover';
  end if;
  update public.weddings
  set cover_path = p_path,
      updated_at = now()
  where id = p_wedding;
end;
$$;

revoke all on function public.set_wedding_cover(uuid, text) from public, anon;
grant execute on function public.set_wedding_cover(uuid, text) to authenticated;
