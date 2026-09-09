-- LeadFlow multi-tenant SaaS foundation.
-- Public form submissions authenticate with an opaque business token; they never
-- receive or choose a business UUID.

create table if not exists public.public_intake_tokens (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.public_intake_tokens enable row level security;

-- Existing businesses receive one endpoint token immediately. New businesses
-- receive one in handle_new_auth_user below.
insert into public.public_intake_tokens (business_id)
select id
from public.businesses
on conflict (business_id) do nothing;

-- Normalize existing identities before enforcing tenant-scoped uniqueness.
update public.customers
set phone = nullif(regexp_replace(phone, '[^0-9]', '', 'g'), '')
where phone is not null;

update public.customers
set email = nullif(lower(btrim(email)), '')
where email is not null;

alter table public.customers
  drop constraint if exists customers_business_id_phone_key;

drop index if exists public.idx_customers_biz_email;

create unique index if not exists customers_business_normalized_phone_key
  on public.customers (business_id, phone)
  where phone is not null and deleted_at is null;

create unique index if not exists customers_business_normalized_email_without_phone_key
  on public.customers (business_id, email)
  where phone is null and email is not null and deleted_at is null;

-- Keep the existing owner-onboarding flow and provision a public token with the
-- workspace. The sign-up form already supplies the business metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
  new_agency_id uuid;
  business_name text;
  business_industry text;
  business_website text;
begin
  business_name := nullif(trim(new.raw_user_meta_data ->> 'business_name'), '');
  business_industry := nullif(trim(new.raw_user_meta_data ->> 'industry'), '');
  business_website := nullif(trim(new.raw_user_meta_data ->> 'website'), '');

  if business_name is null then
    return new;
  end if;

  select a.id
  into new_agency_id
  from public.agencies a
  where a.deleted_at is null
  order by a.created_at
  limit 1;

  if new_agency_id is null then
    raise exception 'No active agency exists for new CRM user';
  end if;

  insert into public.businesses (agency_id, name, industry, website, is_active)
  values (new_agency_id, business_name, coalesce(business_industry, 'Other'), business_website, true)
  returning id into new_business_id;

  insert into public.users (id, business_id, email, full_name, role, is_active)
  values (
    new.id,
    new_business_id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'OWNER',
    true
  )
  on conflict (id) do update
    set business_id = excluded.business_id,
        email = excluded.email,
        full_name = excluded.full_name,
        role = 'OWNER',
        is_active = true;

  insert into public.public_intake_tokens (business_id)
  values (new_business_id)
  on conflict (business_id) do nothing;

  return new;
end;
$$;

-- Return an authenticated user's current workspace token for a future settings
-- screen or form embed flow. The token table itself remains unreadable by roles.
create or replace function public.get_my_public_intake_token()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.token
  from public.public_intake_tokens t
  join public.users u on u.business_id = t.business_id
  where u.id = auth.uid()
    and t.revoked_at is null
  limit 1;
$$;

-- Public intake resolves the business entirely inside the database from the
-- opaque token. The browser never supplies a business UUID or customer ID.
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
set search_path = public
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

  -- Serialize matching identities so concurrent form retries cannot create two
  -- customers for the same tenant-scoped phone/email.
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

  insert into public.leads (
    business_id,
    customer_id,
    enquiry,
    product_interest,
    source,
    temperature,
    lead_score,
    stage,
    status,
    updated_at
  )
  values (
    v_business_id,
    v_customer_id,
    v_message,
    v_service,
    'public_form',
    v_temperature,
    v_score_value,
    'NEW',
    'OPEN',
    now()
  )
  returning id into v_lead_id;

  insert into public.lead_scores (lead_id, business_id, score, temperature, breakdown, confidence, reason)
  values (
    v_lead_id,
    v_business_id,
    v_score_value,
    v_temperature,
    coalesce(v_score -> 'breakdown', '{}'::jsonb),
    1,
    'Public form submission'
  );

  insert into public.activities (business_id, lead_id, customer_id, actor, type, detail)
  values (
    v_business_id,
    v_lead_id,
    v_customer_id,
    'system',
    'LEAD_CREATED',
    jsonb_build_object('source', 'public_form', 'score', v_score_value, 'temperature', v_temperature)
  );

  return jsonb_build_object('lead_id', v_lead_id, 'customer_id', v_customer_id);
end;
$$;

revoke all on function public.current_user_business_id() from public, anon;
grant execute on function public.current_user_business_id() to authenticated;

revoke all on function public.get_my_public_intake_token() from public, anon;
grant execute on function public.get_my_public_intake_token() to authenticated;

revoke all on function public.create_public_lead(uuid, text, text, text, text, text) from public;
grant execute on function public.create_public_lead(uuid, text, text, text, text, text) to anon, authenticated;

-- Every relationship referenced by an authenticated tenant write must belong to
-- the same business. These replace the existing tautological tenant checks.
drop policy if exists tenant_insert_activities on public.activities;
create policy tenant_insert_activities on public.activities for insert to authenticated
with check (
  business_id = public.current_user_business_id()
  and (lead_id is null or exists (select 1 from public.leads l where l.id = activities.lead_id and l.business_id = activities.business_id))
  and (customer_id is null or exists (select 1 from public.customers c where c.id = activities.customer_id and c.business_id = activities.business_id))
);

drop policy if exists tenant_insert_leads on public.leads;
drop policy if exists tenant_update_leads on public.leads;
create policy tenant_insert_leads on public.leads for insert to authenticated
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.customers c where c.id = leads.customer_id and c.business_id = leads.business_id and c.deleted_at is null)
);
create policy tenant_update_leads on public.leads for update to authenticated
using (business_id = public.current_user_business_id())
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.customers c where c.id = leads.customer_id and c.business_id = leads.business_id and c.deleted_at is null)
);

drop policy if exists tenant_insert_conversations on public.conversations;
drop policy if exists tenant_update_conversations on public.conversations;
create policy tenant_insert_conversations on public.conversations for insert to authenticated
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.customers c where c.id = conversations.customer_id and c.business_id = conversations.business_id and c.deleted_at is null)
  and (lead_id is null or exists (select 1 from public.leads l where l.id = conversations.lead_id and l.business_id = conversations.business_id and l.deleted_at is null))
);
create policy tenant_update_conversations on public.conversations for update to authenticated
using (business_id = public.current_user_business_id())
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.customers c where c.id = conversations.customer_id and c.business_id = conversations.business_id and c.deleted_at is null)
  and (lead_id is null or exists (select 1 from public.leads l where l.id = conversations.lead_id and l.business_id = conversations.business_id and l.deleted_at is null))
);

drop policy if exists tenant_insert_messages on public.messages;
create policy tenant_insert_messages on public.messages for insert to authenticated
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.conversations c where c.id = messages.conversation_id and c.business_id = messages.business_id)
);

drop policy if exists tenant_insert_followups on public.followups;
create policy tenant_insert_followups on public.followups for insert to authenticated
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.leads l where l.id = followups.lead_id and l.business_id = followups.business_id)
  and exists (select 1 from public.customers c where c.id = followups.customer_id and c.business_id = followups.business_id)
  and (conversation_id is null or exists (select 1 from public.conversations c where c.id = followups.conversation_id and c.business_id = followups.business_id))
);

drop policy if exists tenant_insert_communication_preferences on public.communication_preferences;
create policy tenant_insert_communication_preferences on public.communication_preferences for insert to authenticated
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.customers c where c.id = communication_preferences.customer_id and c.business_id = communication_preferences.business_id)
);

drop policy if exists tenant_insert_lead_scores on public.lead_scores;
create policy tenant_insert_lead_scores on public.lead_scores for insert to authenticated
with check (
  business_id = public.current_user_business_id()
  and exists (select 1 from public.leads l where l.id = lead_scores.lead_id and l.business_id = lead_scores.business_id)
);
