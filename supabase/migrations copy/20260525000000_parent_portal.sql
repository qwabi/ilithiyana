-- Parent portal: profiles, packages, scheduling, payments RLS, enrollment lead types

-- Enums
do $$ begin
  create type preferred_contact_method as enum ('email', 'whatsapp');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type enrollment_lead_type as enum ('initial', 'add_child');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type learner_status as enum ('active', 'paused', 'inactive');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type enrollment_status as enum ('active', 'paused', 'cancelled');
exception when duplicate_object then null;
end $$;

alter type subscription_status add value if not exists 'active';

-- Profiles
alter table profiles
  add column if not exists province text,
  add column if not exists preferred_contact preferred_contact_method default 'email';

-- Parents
alter table parents
  add column if not exists preferred_contact preferred_contact_method default 'email';

-- Learners
alter table learners
  add column if not exists subjects text[] not null default '{}',
  add column if not exists status learner_status not null default 'active';

-- Applications
alter table applications
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists rejection_reason text;

-- Subscriptions
alter table subscriptions
  add column if not exists parent_id uuid references parents(id) on delete cascade,
  add column if not exists payfast_token text,
  add column if not exists billing_date date,
  add column if not exists next_billing_date date,
  add column if not exists cycles_completed integer not null default 0;

update subscriptions s
set parent_id = l.parent_id
from learners l
where l.id = s.learner_id and s.parent_id is null;

-- Backfill paid → active runs in next migration (enum value cannot be used in same txn as ADD VALUE)

-- Payments
alter table payments
  add column if not exists parent_id uuid references parents(id) on delete set null,
  add column if not exists learner_id uuid references learners(id) on delete set null,
  add column if not exists payfast_payment_id text,
  add column if not exists itn_payload jsonb;

update payments p
set parent_id = l.parent_id,
    learner_id = s.learner_id
from subscriptions s
join learners l on l.id = s.learner_id
where p.subscription_id = s.id and p.parent_id is null;

-- Packages catalog
create table if not exists packages (
  id text primary key,
  name text not null,
  description text not null,
  price_cents integer not null check (price_cents >= 0),
  billing_type text not null check (billing_type in ('recurring', 'once_off')),
  sessions_per_month integer,
  career_guidance_hours integer not null default 4,
  max_subjects integer not null default 4,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into packages (id, name, description, price_cents, billing_type, sessions_per_month, career_guidance_hours, max_subjects)
values
  (
    'package-a',
    'Package A',
    '8 lessons per month, 4 hours career guidance, up to 4 subjects, all grade levels',
    100000,
    'recurring',
    8,
    4,
    4
  ),
  (
    'package-b',
    'Package B',
    'Pay per session, 4 hours career guidance, 1 hour per lesson, flexible booking',
    17500,
    'once_off',
    null,
    4,
    4
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  billing_type = excluded.billing_type,
  sessions_per_month = excluded.sessions_per_month;

-- Class catalog columns on existing classes (learner-bound legacy + catalog fields)
alter table classes
  add column if not exists schedule_day text,
  add column if not exists schedule_time time,
  add column if not exists duration_minutes integer default 60,
  add column if not exists is_active boolean not null default true;

-- Class enrollments & sessions
create table if not exists class_enrollments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  status enrollment_status not null default 'active',
  unique (learner_id, class_id)
);

create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  scheduled_at timestamptz not null,
  happened boolean not null default false,
  cancelled boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  learner_id uuid not null references learners(id) on delete cascade,
  attended boolean not null default false,
  unique (session_id, learner_id)
);

create index if not exists class_sessions_scheduled_idx on class_sessions (scheduled_at);
create index if not exists class_enrollments_learner_idx on class_enrollments (learner_id);

-- Enrollment leads extensions
alter table enrollment_leads
  add column if not exists lead_type enrollment_lead_type not null default 'initial',
  add column if not exists parent_id uuid references parents(id) on delete set null,
  add column if not exists preferred_contact preferred_contact_method default 'email',
  add column if not exists learner_level text,
  add column if not exists proof_url text,
  add column if not exists report_storage_path text;

-- Backfill report_storage_path from migration 20260524140000 if column exists only as report_url
-- (already may exist from storage migration)

-- Updated subject validation (portal + apply)
create or replace function validate_application_payload(
  p_province text,
  p_subjects text[],
  p_package_id text,
  p_grade smallint
)
returns void
language plpgsql
as $$
declare
  allowed_provinces text[] := array[
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
  ];
  allowed_subjects text[] := array[
    'Pure Maths', 'Pure Mathematics',
    'Physical Science', 'Physical Sciences',
    'Life Sciences', 'English',
    'Natural Sciences'
  ];
  s text;
  normalized text;
begin
  if p_province is null or not (p_province = any (allowed_provinces)) then
    raise exception 'invalid_province' using errcode = '22023';
  end if;

  if p_package_id is null or p_package_id not in ('package-a', 'package-b') then
    raise exception 'invalid_package' using errcode = '22023';
  end if;

  if p_grade is null or p_grade < 6 or p_grade > 12 then
    raise exception 'invalid_grade' using errcode = '22023';
  end if;

  if p_subjects is null or cardinality(p_subjects) < 1 then
    raise exception 'subjects_required' using errcode = '22023';
  end if;

  if cardinality(p_subjects) > 4 then
    raise exception 'too_many_subjects' using errcode = '22023';
  end if;

  foreach s in array p_subjects loop
    normalized := s;
    if normalized = 'Pure Mathematics' then normalized := 'Pure Maths'; end if;
    if normalized = 'Physical Sciences' then normalized := 'Physical Science'; end if;
    if not (normalized = any (allowed_subjects)) then
      raise exception 'invalid_subject: %', s using errcode = '22023';
    end if;
  end loop;
end;
$$;

drop function if exists convert_paid_enrollment_lead(uuid, text);

-- Convert initial paid lead (returns json for ITN orchestration)
create or replace function convert_paid_enrollment_lead(
  p_lead_id uuid,
  p_payfast_payment_id text default null,
  p_itn_payload jsonb default null,
  p_payfast_token text default null
)
returns jsonb
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
  v_pay_id uuid;
  v_parent_json jsonb;
  v_learner_json jsonb;
  v_existing_parent uuid;
begin
  select * into v_lead from enrollment_leads where id = p_lead_id for update;

  if not found then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;

  if v_lead.lead_type = 'add_child' then
    raise exception 'use_convert_add_child' using errcode = '22023';
  end if;

  if v_lead.status = 'paid' and v_lead.converted_application_id is not null then
    select id into v_pay_id from payments
    where application_id = v_lead.converted_application_id
    order by created_at desc limit 1;

    return jsonb_build_object(
      'application_id', v_lead.converted_application_id,
      'parent_id', v_lead.converted_parent_id,
      'subscription_id', (select id from subscriptions where learner_id = (
        select learner_id from applications where id = v_lead.converted_application_id
      ) limit 1),
      'payment_id', v_pay_id,
      'lead_type', 'initial',
      'is_new_parent', false
    );
  end if;

  if v_lead.status <> 'awaiting_payment' then
    raise exception 'lead_not_awaiting_payment' using errcode = '22023';
  end if;

  perform validate_application_payload(
    v_lead.province, v_lead.subjects, v_lead.package_id, v_lead.learner_grade
  );

  select id into v_existing_parent from parents where lower(email) = lower(v_lead.parent_email);

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
    'grade', v_lead.learner_grade::text,
    'level', v_lead.learner_level
  );

  if v_existing_parent is not null then
    v_parent_id := v_existing_parent;
    update parents set
      phone = v_lead.parent_phone,
      province = v_lead.province,
      preferred_contact = coalesce(v_lead.preferred_contact, preferred_contact)
    where id = v_parent_id;
  else
    insert into parents (first_name, last_name, email, phone, address, province, preferred_contact)
    values (
      v_lead.parent_first_name, v_lead.parent_last_name, v_lead.parent_email,
      v_lead.parent_phone, v_lead.parent_address, v_lead.province,
      coalesce(v_lead.preferred_contact, 'email'::preferred_contact_method)
    )
    returning id into v_parent_id;
  end if;

  insert into learners (
    parent_id, first_name, last_name, date_of_birth, school_name, grade, level, subjects, status
  )
  values (
    v_parent_id, v_lead.learner_first_name, v_lead.learner_last_name,
    v_lead.learner_date_of_birth, v_lead.learner_school_name, v_lead.learner_grade,
    v_lead.learner_level, v_lead.subjects, 'active'
  )
  returning id into v_learner_id;

  insert into applications (
    parent_id, learner_id, status, province, subjects, package_id, schedule,
    report_url, payment_proof_url, parent_snapshot, learner_snapshot
  )
  values (
    v_parent_id, v_learner_id, 'approved', v_lead.province, v_lead.subjects, v_lead.package_id,
    coalesce(v_lead.schedule, '{}'::jsonb),
    coalesce(v_lead.report_url, v_lead.report_storage_path),
    v_lead.proof_url, v_parent_json, v_learner_json
  )
  returning id into v_app_id;

  insert into subscriptions (
    learner_id, parent_id, package_id, status, amount_cents,
    period_start, period_end, billing_date, next_billing_date, payfast_token
  )
  values (
    v_learner_id, v_parent_id, v_lead.package_id, 'active', v_lead.amount_cents,
    current_date, (current_date + interval '1 month')::date,
    current_date, (current_date + interval '1 month')::date,
    nullif(trim(p_payfast_token), '')
  )
  returning id into v_sub_id;

  insert into payments (
    subscription_id, application_id, parent_id, learner_id,
    gateway_ref, payfast_payment_id, amount_cents, status, paid_at, itn_payload
  )
  values (
    v_sub_id, v_app_id, v_parent_id, v_learner_id,
    nullif(trim(p_payfast_payment_id), ''),
    nullif(trim(p_payfast_payment_id), ''),
    v_lead.amount_cents, 'complete', now(), p_itn_payload
  )
  returning id into v_pay_id;

  update enrollment_leads set
    status = 'paid',
    payfast_payment_id = coalesce(nullif(trim(p_payfast_payment_id), ''), payfast_payment_id),
    converted_parent_id = v_parent_id,
    converted_application_id = v_app_id,
    paid_at = now()
  where id = p_lead_id;

  return jsonb_build_object(
    'application_id', v_app_id,
    'parent_id', v_parent_id,
    'subscription_id', v_sub_id,
    'payment_id', v_pay_id,
    'lead_type', 'initial',
    'is_new_parent', v_existing_parent is null,
    'parent_email', v_lead.parent_email,
    'parent_first_name', v_lead.parent_first_name,
    'parent_last_name', v_lead.parent_last_name,
    'learner_first_name', v_lead.learner_first_name,
    'learner_last_name', v_lead.learner_last_name,
    'province', v_lead.province,
    'preferred_contact', v_lead.preferred_contact
  );
end;
$$;

-- Convert add-child paid lead
create or replace function convert_add_child_lead(
  p_lead_id uuid,
  p_payfast_payment_id text default null,
  p_itn_payload jsonb default null,
  p_payfast_token text default null
)
returns jsonb
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
  v_pay_id uuid;
  v_parent_json jsonb;
  v_learner_json jsonb;
begin
  select * into v_lead from enrollment_leads where id = p_lead_id for update;

  if not found then raise exception 'lead_not_found' using errcode = 'P0002'; end if;
  if v_lead.lead_type <> 'add_child' then
    raise exception 'not_add_child_lead' using errcode = '22023';
  end if;

  if v_lead.status = 'paid' and v_lead.converted_application_id is not null then
    return jsonb_build_object(
      'application_id', v_lead.converted_application_id,
      'parent_id', v_lead.parent_id,
      'lead_type', 'add_child',
      'already_converted', true
    );
  end if;

  if v_lead.status <> 'awaiting_payment' then
    raise exception 'lead_not_awaiting_payment' using errcode = '22023';
  end if;

  v_parent_id := v_lead.parent_id;
  if v_parent_id is null then
    raise exception 'missing_parent_id' using errcode = '22023';
  end if;

  perform validate_application_payload(
    v_lead.province, v_lead.subjects, v_lead.package_id, v_lead.learner_grade
  );

  v_parent_json := jsonb_build_object(
    'firstName', v_lead.parent_first_name,
    'lastName', v_lead.parent_last_name,
    'email', v_lead.parent_email,
    'phone', v_lead.parent_phone
  );

  v_learner_json := jsonb_build_object(
    'firstName', v_lead.learner_first_name,
    'lastName', v_lead.learner_last_name,
    'dateOfBirth', v_lead.learner_date_of_birth::text,
    'schoolName', v_lead.learner_school_name,
    'grade', v_lead.learner_grade::text,
    'level', v_lead.learner_level
  );

  insert into learners (
    parent_id, first_name, last_name, date_of_birth, school_name, grade, level, subjects, status
  )
  values (
    v_parent_id, v_lead.learner_first_name, v_lead.learner_last_name,
    v_lead.learner_date_of_birth, v_lead.learner_school_name, v_lead.learner_grade,
    v_lead.learner_level, v_lead.subjects, 'active'
  )
  returning id into v_learner_id;

  insert into applications (
    parent_id, learner_id, status, province, subjects, package_id, schedule,
    report_url, payment_proof_url, parent_snapshot, learner_snapshot
  )
  values (
    v_parent_id, v_learner_id, 'pending', v_lead.province, v_lead.subjects, v_lead.package_id,
    coalesce(v_lead.schedule, '{}'::jsonb),
    coalesce(v_lead.report_url, v_lead.report_storage_path),
    v_lead.proof_url, v_parent_json, v_learner_json
  )
  returning id into v_app_id;

  insert into subscriptions (
    learner_id, parent_id, package_id, status, amount_cents,
    period_start, period_end, billing_date, next_billing_date, payfast_token
  )
  values (
    v_learner_id, v_parent_id, v_lead.package_id, 'active', v_lead.amount_cents,
    current_date, (current_date + interval '1 month')::date,
    current_date, (current_date + interval '1 month')::date,
    nullif(trim(p_payfast_token), '')
  )
  returning id into v_sub_id;

  insert into payments (
    subscription_id, application_id, parent_id, learner_id,
    payfast_payment_id, amount_cents, status, paid_at, itn_payload
  )
  values (
    v_sub_id, v_app_id, v_parent_id, v_learner_id,
    nullif(trim(p_payfast_payment_id), ''),
    v_lead.amount_cents, 'complete', now(), p_itn_payload
  )
  returning id into v_pay_id;

  update enrollment_leads set
    status = 'paid',
    payfast_payment_id = coalesce(nullif(trim(p_payfast_payment_id), ''), payfast_payment_id),
    converted_parent_id = v_parent_id,
    converted_application_id = v_app_id,
    paid_at = now()
  where id = p_lead_id;

  return jsonb_build_object(
    'application_id', v_app_id,
    'parent_id', v_parent_id,
    'subscription_id', v_sub_id,
    'payment_id', v_pay_id,
    'lead_type', 'add_child',
    'parent_email', v_lead.parent_email,
    'learner_first_name', v_lead.learner_first_name,
    'learner_last_name', v_lead.learner_last_name
  );
end;
$$;

revoke all on function convert_paid_enrollment_lead(uuid, text, jsonb, text) from public;
grant execute on function convert_paid_enrollment_lead(uuid, text, jsonb, text) to service_role;

revoke all on function convert_add_child_lead(uuid, text, jsonb, text) from public;
grant execute on function convert_add_child_lead(uuid, text, jsonb, text) to service_role;

-- RLS: payments for parents
create policy payments_select_parent on payments
  for select to authenticated
  using (
    exists (
      select 1 from parents p
      where p.profile_id = auth.uid()
        and (p.id = payments.parent_id or is_parent_of(payments.parent_id))
    )
    or exists (
      select 1
      from subscriptions s
      join learners l on l.id = s.learner_id
      join parents p on p.id = l.parent_id
      where s.id = payments.subscription_id and p.profile_id = auth.uid()
    )
  );

-- Parents can update own row
create policy parents_update_own on parents
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Packages: read for authenticated
alter table packages enable row level security;

create policy packages_read_authenticated on packages
  for select to authenticated
  using (is_active = true or is_admin());

create policy packages_admin_all on packages
  for all to authenticated
  using (is_admin())
  with check (is_admin());

grant select on packages to authenticated, service_role;

-- Class enrollments & sessions RLS
alter table class_enrollments enable row level security;
alter table class_sessions enable row level security;
alter table session_attendance enable row level security;

create policy class_enrollments_admin_all on class_enrollments
  for all to authenticated using (is_admin()) with check (is_admin());

create policy class_enrollments_select_parent on class_enrollments
  for select to authenticated
  using (is_parent_of((select parent_id from learners where id = learner_id)));

create policy class_sessions_admin_all on class_sessions
  for all to authenticated using (is_admin()) with check (is_admin());

create policy class_sessions_select_parent on class_sessions
  for select to authenticated
  using (
    exists (
      select 1 from class_enrollments ce
      join learners l on l.id = ce.learner_id
      join parents p on p.id = l.parent_id
      where ce.class_id = class_sessions.class_id
        and p.profile_id = auth.uid()
    )
    or exists (
      select 1 from classes c
      join learners l on l.id = c.learner_id
      join parents p on p.id = l.parent_id
      where c.id = class_sessions.class_id and p.profile_id = auth.uid()
    )
  );

create policy session_attendance_admin_all on session_attendance
  for all to authenticated using (is_admin()) with check (is_admin());

create policy session_attendance_select_parent on session_attendance
  for select to authenticated
  using (is_parent_of((select parent_id from learners where id = learner_id)));

grant select on class_enrollments, class_sessions, session_attendance to authenticated;
grant all on class_enrollments, class_sessions, session_attendance to service_role;
