-- Public intake remains the CRM system of record. The workflow receives the
-- IDs created here only after the customer, lead, score, and activity commit.
create or replace function public.create_public_lead(
  p_token uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_service text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_customer_id uuid;
  v_lead_id uuid;
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_service text := nullif(btrim(coalesce(p_service, '')), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_score jsonb;
  v_score_value integer;
  v_temperature text;
begin
  if v_name is null or v_message is null or (v_phone is null and v_email is null) then
    raise exception 'Name, a phone or email, and message are required' using errcode = '22023';
  end if;

  if length(v_name) > 100 or length(v_message) > 3000 then
    raise exception 'Lead details exceed the allowed length' using errcode = '22023';
  end if;

  select t.business_id
  into v_business_id
  from public.public_intake_tokens t
  join public.businesses b on b.id = t.business_id
  where t.token = p_token
    and t.revoked_at is null
    and b.is_active
    and b.deleted_at is null;

  if v_business_id is null then
    raise exception 'Unknown or inactive public intake endpoint' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_business_id::text || ':' || coalesce(v_phone, v_email), 0));

  if v_phone is not null then
    select id
    into v_customer_id
    from public.customers
    where business_id = v_business_id
      and phone = v_phone
      and deleted_at is null
    order by last_seen_at desc
    limit 1;
  else
    select id
    into v_customer_id
    from public.customers
    where business_id = v_business_id
      and phone is null
      and email = v_email
      and deleted_at is null
    order by last_seen_at desc
    limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (business_id, full_name, phone, email, consent, source)
    values (v_business_id, v_name, v_phone, v_email, true, 'public_form')
    returning id into v_customer_id;
  else
    update public.customers
    set full_name = coalesce(v_name, full_name),
        phone = coalesce(v_phone, phone),
        email = coalesce(v_email, email),
        last_seen_at = now()
    where id = v_customer_id
      and business_id = v_business_id;
  end if;

  v_score := public.calculate_lead_score(null, null, null, null, v_service, v_message, v_phone, v_email);
  v_score_value := coalesce((v_score ->> 'score')::integer, 0);
  v_temperature := coalesce(v_score ->> 'temperature', 'COLD');

  insert into public.leads (business_id, customer_id, enquiry, product_interest, source, temperature, lead_score, stage, status, updated_at)
  values (v_business_id, v_customer_id, v_message, v_service, 'public_form', v_temperature, v_score_value, 'NEW', 'OPEN', now())
  returning id into v_lead_id;

  insert into public.lead_scores (lead_id, business_id, score, temperature, breakdown, confidence, reason)
  values (v_lead_id, v_business_id, v_score_value, v_temperature, coalesce(v_score -> 'breakdown', '{}'::jsonb), 1, 'Public form submission');

  insert into public.activities (business_id, lead_id, customer_id, actor, type, detail)
  values (v_business_id, v_lead_id, v_customer_id, 'system', 'LEAD_CREATED', jsonb_build_object('source', 'public_form', 'score', v_score_value, 'temperature', v_temperature));

  return jsonb_build_object(
    'business_id', v_business_id,
    'lead_id', v_lead_id,
    'customer_id', v_customer_id
  );
end;
$$;

revoke all on function public.create_public_lead(uuid, text, text, text, text, text) from public;
grant execute on function public.create_public_lead(uuid, text, text, text, text, text) to anon, authenticated;
