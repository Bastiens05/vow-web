-- Le couple ne peut pas lire une fiche prestataire non publiée.
-- Sans l'identifiant de cette fiche, la page Documents ne charge aucune demande,
-- alors que les lignes existent et que la notification part.
-- Cette fonction ne renvoie l'identifiant que pour un mariage dont l'appelant est le couple,
-- ou pour le prestataire lui-même.

create or replace function public.wedding_vendor_id(p_wedding uuid, p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select v.id
  from public.vendor_profiles v
  join public.wedding_members m
    on m.user_id = v.user_id
   and m.wedding_id = p_wedding
   and m.member_role = 'vendor'
  where v.user_id = p_user
    and (
      public.is_wedding_couple(p_wedding)
      or (
        auth.uid() = p_user
        and exists (
          select 1
          from public.wedding_members self
          where self.wedding_id = p_wedding
            and self.user_id = auth.uid()
            and self.member_role = 'vendor'
        )
      )
    );
$$;

revoke all on function public.wedding_vendor_id(uuid, uuid) from public, anon;
grant execute on function public.wedding_vendor_id(uuid, uuid) to authenticated;

-- Recopie les listes déjà définies dans Réglages, sans renvoyer une notification
-- pour chaque mariage déjà relié. Les ajouts suivants préviennent le couple.

drop function if exists public.copy_vendor_document_requests(uuid, uuid);

create function public.copy_vendor_document_requests(p_wedding uuid, p_vendor uuid, p_notify boolean default true)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  wedding_day date;
  vendor_user uuid;
  studio text;
  added integer := 0;
  couple uuid;
begin
  select w.wedding_date, v.user_id, nullif(btrim(v.business_name), '')
    into wedding_day, vendor_user, studio
  from public.weddings w
  join public.vendor_profiles v on v.id = p_vendor
  where w.id = p_wedding;
  if vendor_user is null then
    return 0;
  end if;
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and member_role = 'couple'
  ) then
    return 0;
  end if;
  if not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding and user_id = vendor_user and member_role = 'vendor'
  ) then
    return 0;
  end if;

  insert into public.wedding_document_requests (
    wedding_id, vendor_id, template_id, title, note, required, due_on, position
  )
  select
    p_wedding,
    t.vendor_id,
    t.id,
    t.title,
    t.note,
    t.required,
    case
      when t.offset_days is null or wedding_day is null then null
      else (wedding_day + t.offset_days)
    end,
    t.position
  from public.vendor_document_templates t
  where t.vendor_id = p_vendor
    and not exists (
      select 1 from public.wedding_document_requests r
      where r.wedding_id = p_wedding and r.template_id = t.id
    );
  get diagnostics added = row_count;
  if added = 0 or not p_notify then
    return added;
  end if;

  for couple in
    select user_id from public.wedding_members
    where wedding_id = p_wedding and member_role = 'couple'
  loop
    insert into public.wedding_notifications (wedding_id, author_id, kind, body, recipient_user_id)
    values (
      p_wedding,
      vendor_user,
      'reminder',
      left(
        coalesce(studio, 'Votre prestataire') || ' vous demande ' ||
        case when added = 1 then '1 document.' else added::text || ' documents.' end,
        500
      ),
      couple
    );
  end loop;
  return added;
end;
$$;

revoke all on function public.copy_vendor_document_requests(uuid, uuid, boolean) from public, anon, authenticated;

create or replace function public.copy_new_document_template()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
begin
  for wid in
    select m.wedding_id
    from public.wedding_members m
    join public.vendor_profiles v on v.user_id = m.user_id and v.id = new.vendor_id
    where m.member_role = 'vendor'
  loop
    perform public.copy_vendor_document_requests(wid, new.vendor_id, true);
  end loop;
  return new;
end;
$$;

drop trigger if exists vendor_document_templates_copy on public.vendor_document_templates;
create trigger vendor_document_templates_copy
  after insert on public.vendor_document_templates
  for each row execute function public.copy_new_document_template();

do $$
declare
  rec record;
begin
  for rec in
    select distinct m.wedding_id, v.id as vendor_id
    from public.wedding_members m
    join public.vendor_profiles v on v.user_id = m.user_id
    where m.member_role = 'vendor'
  loop
    perform public.copy_vendor_document_requests(rec.wedding_id, rec.vendor_id, false);
  end loop;
end;
$$;
