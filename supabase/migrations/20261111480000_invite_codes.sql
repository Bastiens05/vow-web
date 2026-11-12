-- Un code partageable porte la même offre qu'une invitation par e-mail.
-- Les codes déjà créés n'ont pas de type : ils gardent l'ancien accès test.

alter table public.tester_codes
  add column if not exists grant_type text,
  add column if not exists plan text,
  add column if not exists discount_percent integer,
  add column if not exists code_text text,
  add column if not exists revoked_at timestamptz;

alter table public.tester_codes drop constraint if exists tester_codes_grant_type;
alter table public.tester_codes
  add constraint tester_codes_grant_type check (grant_type is null or grant_type in ('tester', 'lifetime'));

alter table public.tester_codes drop constraint if exists tester_codes_plan;
alter table public.tester_codes
  add constraint tester_codes_plan check (plan is null or plan in ('essentiel', 'pro', 'studio'));

alter table public.tester_codes drop constraint if exists tester_codes_offer_shape;
alter table public.tester_codes
  add constraint tester_codes_offer_shape check (
    grant_type is null
    or (
      plan is not null
      and (
        (grant_type = 'tester' and discount_percent between 0 and 100)
        or (grant_type = 'lifetime' and discount_percent is null)
      )
    )
  );

create or replace function public.redeem_tester_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  vid uuid;
  rec public.tester_codes%rowtype;
begin
  if uid is null then
    raise exception 'Authentification requise';
  end if;
  select id into vid from public.vendor_profiles where user_id = uid;
  if vid is null then
    raise exception 'Réservé aux prestataires';
  end if;

  select * into rec
  from public.tester_codes
  where code_hash = public.tester_code_hash(p_code)
  for update;
  if rec.id is null then
    raise exception 'Code inconnu';
  end if;
  if rec.revoked_at is not null then
    raise exception 'Code révoqué';
  end if;
  if rec.expires_at is not null and rec.expires_at <= now() then
    raise exception 'Code expiré';
  end if;

  if exists (select 1 from public.tester_redemptions where code_id = rec.id and vendor_id = vid) then
    perform public.apply_share_code(vid, rec.id);
    return 'deja';
  end if;

  if rec.use_count >= rec.max_uses then
    raise exception 'Code épuisé';
  end if;

  update public.tester_codes set use_count = use_count + 1 where id = rec.id;
  insert into public.tester_redemptions (code_id, vendor_id) values (rec.id, vid);
  perform public.apply_share_code(vid, rec.id);
  return 'ok';
end;
$$;

create or replace function public.apply_share_code(p_vendor uuid, p_code uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.tester_codes%rowtype;
  until_at timestamptz;
begin
  select * into rec from public.tester_codes where id = p_code;
  if rec.id is null or rec.revoked_at is not null then
    return;
  end if;
  if rec.grant_type is null or rec.plan is null then
    update public.vendor_billing
      set status = 'tester', tester_until = rec.access_until
      where vendor_id = p_vendor;
    return;
  end if;
  until_at := case when rec.grant_type = 'tester' then now() + interval '1 year' else null end;
  update public.vendor_billing
    set plan = rec.plan,
        status = 'active',
        comped = true,
        tester_until = until_at,
        free_until = until_at,
        discount_percent = case when rec.grant_type = 'tester' then rec.discount_percent else null end
    where vendor_id = p_vendor;
end;
$$;

revoke all on function public.apply_share_code(uuid, uuid) from public, anon, authenticated;

create or replace function public.create_share_code(
  p_grant_type text,
  p_plan text,
  p_discount integer,
  p_max_uses integer,
  p_expires timestamptz,
  p_code text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  kind text := coalesce(nullif(btrim(p_grant_type), ''), 'tester');
  clean text := btrim(coalesce(p_code, ''));
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt integer := 0;
  plan_label text;
  offer_label text;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if kind not in ('tester', 'lifetime') then
    raise exception 'Type d''invitation inconnu';
  end if;
  if p_plan is null or p_plan not in ('essentiel', 'pro', 'studio') then
    raise exception 'Formule inconnue';
  end if;
  if kind = 'tester' and (p_discount is null or p_discount < 0 or p_discount > 100) then
    raise exception 'Remise invalide';
  end if;
  if p_max_uses is null or p_max_uses < 1 or p_max_uses > 10000 then
    raise exception 'Indiquez un nombre d''utilisations';
  end if;
  if clean <> '' and (char_length(clean) < 8 or char_length(clean) > 64) then
    raise exception 'Le code doit faire entre 8 et 64 caractères';
  end if;
  plan_label := case p_plan when 'pro' then 'Pro' when 'studio' then 'Studio' else 'Essentiel' end;
  offer_label := case when kind = 'lifetime' then 'Offert à vie ' else 'Testeur ' end || plan_label;

  loop
    attempt := attempt + 1;
    if clean = '' then
      clean := 'VOW-';
      for i in 1..8 loop
        clean := clean || substr(chars, 1 + floor(random() * char_length(chars))::int, 1);
      end loop;
    end if;
    begin
      insert into public.tester_codes (
        label, code_hash, code_text, max_uses, expires_at, access_until, grant_type, plan, discount_percent
      )
      values (
        offer_label,
        public.tester_code_hash(clean),
        clean,
        p_max_uses,
        p_expires,
        null,
        kind,
        p_plan,
        case when kind = 'tester' then p_discount else null end
      );
      return clean;
    exception when unique_violation then
      if btrim(coalesce(p_code, '')) <> '' or attempt >= 5 then
        raise exception 'Ce code existe déjà';
      end if;
      clean := '';
    end;
  end loop;
end;
$$;

revoke all on function public.create_share_code(text, text, integer, integer, timestamptz, text) from public, anon;
grant execute on function public.create_share_code(text, text, integer, integer, timestamptz, text) to authenticated;

create or replace function public.revoke_share_code(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.tester_codes
    set revoked_at = now()
    where id = p_id and revoked_at is null;
  update public.vendor_billing b
    set free_until = null,
        discount_percent = null,
        tester_until = null,
        plan = 'essentiel',
        status = case
          when b.trial_ends_at > now() then 'trialing'
          else 'expired'
        end,
        comped = false
    from public.tester_redemptions r
    where r.code_id = p_id
      and r.vendor_id = b.vendor_id
      and not exists (
        select 1
        from public.tester_redemptions other
        join public.tester_codes c on c.id = other.code_id
        where other.vendor_id = b.vendor_id
          and other.code_id <> p_id
          and c.revoked_at is null
      );
end;
$$;

revoke all on function public.revoke_share_code(uuid) from public, anon;
grant execute on function public.revoke_share_code(uuid) to authenticated;
