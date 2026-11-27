-- Tell the wedding when the couple signs, in the same calm channel as the other day notes.

create or replace function public.record_signature(
  p_request_id uuid,
  p_name text,
  p_path text,
  p_ip text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.signature_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Indiquez votre nom';
  end if;
  select * into req from public.signature_requests where id = p_request_id;
  if not found or req.status <> 'pending' then
    raise exception 'Cette demande de signature n''est plus ouverte';
  end if;
  if not public.is_wedding_couple(req.wedding_id) then
    raise exception 'Seul le couple peut signer';
  end if;

  update public.signature_requests
  set status = 'signed',
      signer_name = btrim(p_name),
      signature_path = left(coalesce(p_path, ''), 300),
      consent_at = now(),
      signed_at = now(),
      signed_by = auth.uid(),
      signer_ip = left(coalesce(p_ip, ''), 64),
      signer_user_agent = left(coalesce(p_user_agent, ''), 300)
  where id = req.id;

  insert into public.wedding_notifications (wedding_id, author_id, kind, body)
  values (req.wedding_id, auth.uid(), 'reminder', 'Le contrat a été signé.');
end;
$$;
