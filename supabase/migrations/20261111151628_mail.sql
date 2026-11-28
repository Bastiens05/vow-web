-- Product email: preferences, an outbox only the service role can read,
-- and reminder unsubscribe. In-app reminders stay as they are.
-- Apply after 20261111010000_daypack.sql.

alter table public.profiles
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_reminders boolean not null default true,
  add column if not exists email_token text;

update public.profiles
set email_token = encode(extensions.gen_random_bytes(24), 'hex')
where email_token is null;

alter table public.profiles
  alter column email_token set default encode(extensions.gen_random_bytes(24), 'hex');

create unique index if not exists profiles_email_token_idx on public.profiles (email_token);

alter table public.reminders
  add column if not exists emailed_at timestamptz;

alter table public.deposits
  add column if not exists emailed_at timestamptz;

create table if not exists public.mail_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  to_email text not null,
  subject text not null,
  heading text not null,
  body text not null,
  button_label text not null,
  button_url text not null,
  unsubscribe_token text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint mail_outbox_kind check (kind in ('lead', 'reminder', 'deposit')),
  constraint mail_outbox_email check (to_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint mail_outbox_len check (
    char_length(subject) between 1 and 180
    and char_length(heading) between 1 and 180
    and char_length(body) between 1 and 2000
    and char_length(button_label) between 1 and 80
    and char_length(button_url) between 1 and 500
  )
);

alter table public.mail_outbox enable row level security;

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Identifiant immuable';
  end if;
  if new.role is distinct from old.role then
    raise exception 'Le rôle du compte ne peut pas être modifié';
  end if;
  new.email := old.email;
  new.email_token := old.email_token;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.unsubscribe_reminders(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  if p_token is null or char_length(p_token) < 16 then
    return false;
  end if;
  update public.profiles
  set notify_reminders = false
  where email_token = p_token;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

create or replace function public.submit_quote_request(
  p_slug text,
  p_names text,
  p_email text,
  p_phone text,
  p_wedding_date date,
  p_place text,
  p_guest_count integer,
  p_message text,
  p_ip text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  vid uuid;
  recent integer;
  lead_id uuid;
  clean_email text := lower(btrim(coalesce(p_email, '')));
  vendor_email text;
  vendor_name text;
  wants_mail boolean;
begin
  if char_length(btrim(coalesce(p_names, ''))) < 2 then
    raise exception 'Indiquez vos noms';
  end if;
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Indiquez un e-mail valide';
  end if;
  if p_message is not null and char_length(p_message) > 2000 then
    raise exception 'Le message est trop long';
  end if;

  select v.id, p.email, v.business_name, p.notify_email
  into vid, vendor_email, vendor_name, wants_mail
  from public.vendor_profiles v
  join public.profiles p on p.id = v.user_id
  where v.slug = p_slug and v.published = true;
  if vid is null then
    raise exception 'Cette page n''accepte pas de demande';
  end if;

  select count(*) into recent
  from public.leads
  where vendor_id = vid
    and created_at > now() - interval '1 hour'
    and (
      email = clean_email
      or (p_ip <> '' and source_ip = p_ip)
    );
  if recent >= 3 then
    raise exception 'Trop de demandes pour le moment. Réessayez dans une heure.';
  end if;

  insert into public.leads (
    vendor_id, full_names, email, phone, wedding_date, place, guest_count, message, source_ip
  )
  values (
    vid,
    btrim(p_names),
    clean_email,
    left(btrim(coalesce(p_phone, '')), 40),
    p_wedding_date,
    left(btrim(coalesce(p_place, '')), 160),
    p_guest_count,
    btrim(coalesce(p_message, '')),
    left(coalesce(p_ip, ''), 64)
  )
  returning id into lead_id;

  if wants_mail and vendor_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    insert into public.mail_outbox (kind, to_email, subject, heading, body, button_label, button_url)
    values (
      'lead',
      vendor_email,
      'Nouvelle demande · ' || left(vendor_name, 80),
      'Nouvelle demande',
      left(btrim(p_names), 120) || ' vous a écrit' ||
        case when p_place is null or btrim(p_place) = '' then '.' else ' pour ' || left(btrim(p_place), 80) || '.' end,
      'Ouvrir les demandes',
      '/demandes'
    );
  end if;

  return lead_id;
end;
$$;

create or replace function public.enqueue_product_mail(p_site text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  queued integer := 0;
  site text := rtrim(coalesce(p_site, ''), '/');
begin
  if site !~ '^https?://[^/]+$' then
    return 0;
  end if;

  insert into public.mail_outbox (kind, to_email, subject, heading, body, button_label, button_url, unsubscribe_token)
  select
    'reminder',
    p.email,
    'Rappel · ' || w.partner_one_name || ' & ' || w.partner_two_name,
    'Un rappel avant le mariage',
    case r.kind
      when 'practical' then 'Les infos pratiques sont encore à compléter.'
      when 'photos' then 'Les groupes photo ne sont pas listés.'
      when 'guests' then 'Les invités et les régimes manquent.'
      when 'document' then 'Aucun document n''est déposé.'
      else 'Un contrat attend une signature.'
    end || ' J-' || r.milestone || '.',
    'Ouvrir le mariage',
    site || '/mariage/' || w.id::text,
    p.email_token
  from public.reminders r
  join public.weddings w on w.id = r.wedding_id
  join public.wedding_members m on m.wedding_id = w.id and m.member_role = 'couple'
  join public.profiles p on p.id = m.user_id
  where r.emailed_at is null
    and r.created_at > now() - interval '2 days'
    and p.notify_email
    and p.notify_reminders
    and p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';
  get diagnostics queued = row_count;

  update public.reminders
  set emailed_at = now()
  where emailed_at is null
    and created_at > now() - interval '2 days';

  insert into public.mail_outbox (kind, to_email, subject, heading, body, button_label, button_url, unsubscribe_token)
  select
    'deposit',
    p.email,
    'Acompte à venir · ' || w.partner_one_name || ' & ' || w.partner_two_name,
    'Un acompte approche',
    'Un acompte de ' || (d.amount_cents / 100) || ' € est dû le ' || to_char(d.due_on, 'DD/MM/YYYY') || '.',
    'Voir les factures',
    site || '/mariage/' || w.id::text || '/devis',
    p.email_token
  from public.deposits d
  join public.weddings w on w.id = d.wedding_id
  join public.wedding_members m on m.wedding_id = w.id and m.member_role = 'couple'
  join public.profiles p on p.id = m.user_id
  where d.status = 'reminded'
    and d.emailed_at is null
    and d.due_on > current_date - 7
    and p.notify_email
    and p.notify_reminders
    and p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$';

  update public.deposits
  set emailed_at = now()
  where status = 'reminded'
    and emailed_at is null
    and due_on > current_date - 7;

  return queued;
end;
$$;

create or replace function public.claim_mail_outbox()
returns setof public.mail_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.mail_outbox
  set sent_at = now()
  where sent_at is null
    and created_at > now() - interval '3 days'
  returning *;
end;
$$;

revoke all on function public.unsubscribe_reminders(text) from public;
revoke all on function public.enqueue_product_mail(text) from public, anon, authenticated;
revoke all on function public.claim_mail_outbox() from public, anon, authenticated;

grant execute on function public.unsubscribe_reminders(text) to anon, authenticated;
grant execute on function public.enqueue_product_mail(text) to service_role;
grant execute on function public.claim_mail_outbox() to service_role;
