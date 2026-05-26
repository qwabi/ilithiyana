-- Prospective parents / enrollment leads (PayFast checkout funnel)

create type enrollment_lead_status as enum (
  'awaiting_payment',
  'paid',
  'cancelled',
  'failed'
);

create table if not exists enrollment_leads (
  id uuid primary key default gen_random_uuid(),
  status enrollment_lead_status not null default 'awaiting_payment',
  parent_first_name text not null,
  parent_last_name text not null,
  parent_email text not null,
  parent_phone text not null,
  parent_address text,
  province text not null,
  learner_first_name text not null,
  learner_last_name text not null,
  learner_date_of_birth date not null,
  learner_school_name text not null,
  learner_grade smallint not null check (learner_grade between 6 and 12),
  subjects text[] not null default '{}',
  package_id text not null,
  schedule jsonb not null default '{}',
  report_url text,
  amount_cents integer not null check (amount_cents >= 0),
  payfast_payment_id text,
  converted_parent_id uuid references parents(id) on delete set null,
  converted_application_id uuid references applications(id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint enrollment_leads_package_id_check check (
    package_id in ('package-a', 'package-b')
  )
);

create index if not exists enrollment_leads_email_idx on enrollment_leads (parent_email);
create index if not exists enrollment_leads_status_idx on enrollment_leads (status);
create index if not exists enrollment_leads_created_idx on enrollment_leads (created_at desc);

alter table enrollment_leads enable row level security;

create policy enrollment_leads_admin_select on enrollment_leads
  for select to authenticated
  using (is_admin());

revoke all on table enrollment_leads from anon;
grant select on table enrollment_leads to authenticated;
grant select, insert, update, delete on table enrollment_leads to service_role;

-- Promote a paid lead to parent, learner, application, subscription, and payment
create or replace function convert_paid_enrollment_lead(
  p_lead_id uuid,
  p_payfast_payment_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead enrollment_leads%rowtype;
  v_parent_id uuid;
  v_learner_id uuid;
  v_app_id uuid;
  v_sub_id uuid;
  v_parent_json jsonb;
  v_learner_json jsonb;
begin
  select * into v_lead
  from enrollment_leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;

  if v_lead.status = 'paid' and v_lead.converted_application_id is not null then
    return v_lead.converted_application_id;
  end if;

  if v_lead.status <> 'awaiting_payment' then
    raise exception 'lead_not_awaiting_payment' using errcode = '22023';
  end if;

  perform validate_application_payload(
    v_lead.province,
    v_lead.subjects,
    v_lead.package_id,
    v_lead.learner_grade
  );

  v_parent_json := jsonb_build_object(
    'firstName', v_lead.parent_first_name,
    'lastName', v_lead.parent_last_name,
    'email', v_lead.parent_email,
    'phone', v_lead.parent_phone,
    'address', coalesce(v_lead.parent_address, '')
  );

  v_learner_json := jsonb_build_object(
    'firstName', v_lead.learner_first_name,
    'lastName', v_lead.learner_last_name,
    'dateOfBirth', v_lead.learner_date_of_birth::text,
    'schoolName', v_lead.learner_school_name,
    'grade', v_lead.learner_grade::text
  );

  insert into parents (
    first_name,
    last_name,
    email,
    phone,
    address,
    province
  )
  values (
    v_lead.parent_first_name,
    v_lead.parent_last_name,
    v_lead.parent_email,
    v_lead.parent_phone,
    v_lead.parent_address,
    v_lead.province
  )
  returning id into v_parent_id;

  insert into learners (
    parent_id,
    first_name,
    last_name,
    date_of_birth,
    school_name,
    grade
  )
  values (
    v_parent_id,
    v_lead.learner_first_name,
    v_lead.learner_last_name,
    v_lead.learner_date_of_birth,
    v_lead.learner_school_name,
    v_lead.learner_grade
  )
  returning id into v_learner_id;

  insert into applications (
    parent_id,
    learner_id,
    status,
    province,
    subjects,
    package_id,
    schedule,
    report_url,
    payment_proof_url,
    parent_snapshot,
    learner_snapshot
  )
  values (
    v_parent_id,
    v_learner_id,
    'approved',
    v_lead.province,
    v_lead.subjects,
    v_lead.package_id,
    coalesce(v_lead.schedule, '{}'::jsonb),
    v_lead.report_url,
    null,
    v_parent_json,
    v_learner_json
  )
  returning id into v_app_id;

  insert into subscriptions (
    learner_id,
    package_id,
    status,
    amount_cents,
    period_start,
    period_end
  )
  values (
    v_learner_id,
    v_lead.package_id,
    'paid',
    v_lead.amount_cents,
    current_date,
    (current_date + interval '1 month')::date
  )
  returning id into v_sub_id;

  insert into payments (
    subscription_id,
    application_id,
    gateway_ref,
    amount_cents,
    status,
    paid_at
  )
  values (
    v_sub_id,
    v_app_id,
    nullif(trim(p_payfast_payment_id), ''),
    v_lead.amount_cents,
    'complete',
    now()
  );

  update enrollment_leads
  set
    status = 'paid',
    payfast_payment_id = coalesce(nullif(trim(p_payfast_payment_id), ''), payfast_payment_id),
    converted_parent_id = v_parent_id,
    converted_application_id = v_app_id,
    paid_at = now()
  where id = p_lead_id;

  return v_app_id;
end;
$$;

revoke all on function convert_paid_enrollment_lead(uuid, text) from public;
grant execute on function convert_paid_enrollment_lead(uuid, text) to service_role;
