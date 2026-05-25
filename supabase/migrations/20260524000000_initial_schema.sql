-- Ilithiyana Academics platform schema (Wave 1)

create extension if not exists "pgcrypto";

-- Enums
create type application_status as enum ('pending', 'approved', 'rejected');
create type subscription_status as enum ('paid', 'pending', 'overdue', 'cancelled');
create type timesheet_status as enum ('submitted', 'approved', 'rejected');
create type payment_status as enum ('pending', 'complete', 'failed', 'cancelled');
create type user_role as enum ('admin', 'parent', 'tutor', 'learner');

-- Profiles (extends auth.users when using Supabase Auth)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'parent',
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  address text,
  province text not null,
  created_at timestamptz not null default now()
);

create table if not exists learners (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  school_name text not null,
  grade smallint not null check (grade between 6 and 12),
  level text,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references parents(id) on delete set null,
  learner_id uuid references learners(id) on delete set null,
  status application_status not null default 'pending',
  province text not null,
  subjects text[] not null default '{}',
  package_id text not null,
  schedule jsonb not null default '{}',
  report_url text,
  payment_proof_url text,
  parent_snapshot jsonb not null default '{}',
  learner_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_package_id_check check (
    package_id in ('package-a', 'package-b')
  )
);

create table if not exists tutors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  subjects text[] not null default '{}',
  session_rate_cents integer not null default 0 check (session_rate_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  package_id text not null,
  status subscription_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  period_start date,
  period_end date,
  next_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  tutor_id uuid references tutors(id) on delete set null,
  subject text not null,
  grade smallint not null check (grade between 6 and 12),
  level text,
  schedule text,
  meet_link text,
  created_at timestamptz not null default now()
);

create table if not exists tutor_timesheets (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  month_period text not null,
  sessions_count integer not null default 0 check (sessions_count >= 0),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  status timesheet_status not null default 'submitted',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tutor_id, month_period)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete set null,
  application_id uuid references applications(id) on delete set null,
  gateway_ref text,
  amount_cents integer not null check (amount_cents >= 0),
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists applications_status_idx on applications(status);
create index if not exists applications_province_idx on applications(province);
create index if not exists applications_package_idx on applications(package_id);
create index if not exists applications_created_idx on applications(created_at desc);
create index if not exists applications_subjects_gin_idx on applications using gin(subjects);
create index if not exists learners_grade_idx on learners(grade);
create index if not exists learners_parent_idx on learners(parent_id);
create index if not exists subscriptions_status_idx on subscriptions(status);
create index if not exists subscriptions_next_reminder_idx on subscriptions(next_reminder_at);
create index if not exists tutor_timesheets_status_idx on tutor_timesheets(status);
create index if not exists contact_messages_created_idx on contact_messages(created_at desc);

-- Updated_at trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_updated_at on applications;
create trigger applications_updated_at
  before update on applications
  for each row execute function set_updated_at();

drop trigger if exists subscriptions_updated_at on subscriptions;
create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function set_updated_at();

drop trigger if exists tutor_timesheets_updated_at on tutor_timesheets;
create trigger tutor_timesheets_updated_at
  before update on tutor_timesheets
  for each row execute function set_updated_at();

-- Auth helpers
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function is_parent_of(parent_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from parents
    where id = parent_row_id
      and profile_id = auth.uid()
  );
$$;

-- Payload validation (mirrors lib/site-config.ts)
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
    'Pure Maths', 'Natural Sciences', 'Life Sciences', 'English', 'Physical Science'
  ];
  s text;
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

  foreach s in array p_subjects loop
    if not (s = any (allowed_subjects)) then
      raise exception 'invalid_subject: %', s using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- Public application insert (anon via RPC only)
create or replace function submit_application(
  p_parent jsonb,
  p_learner jsonb,
  p_province text,
  p_subjects text[],
  p_package_id text,
  p_schedule jsonb,
  p_report_url text default null,
  p_payment_proof_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid;
  v_learner_id uuid;
  v_app_id uuid;
  v_grade smallint;
  v_parent_first text;
  v_parent_last text;
  v_parent_email text;
  v_parent_phone text;
  v_learner_first text;
  v_learner_last text;
  v_learner_dob date;
  v_school text;
  v_level text;
begin
  v_parent_first := nullif(trim(p_parent->>'firstName'), '');
  v_parent_last := nullif(trim(p_parent->>'lastName'), '');
  v_parent_email := nullif(trim(lower(p_parent->>'email')), '');
  v_parent_phone := nullif(trim(p_parent->>'phone'), '');

  v_learner_first := nullif(trim(p_learner->>'firstName'), '');
  v_learner_last := nullif(trim(p_learner->>'lastName'), '');
  v_school := nullif(trim(p_learner->>'schoolName'), '');
  v_level := nullif(trim(p_learner->>'level'), '');

  if v_parent_first is null or v_parent_last is null or v_parent_email is null or v_parent_phone is null then
    raise exception 'invalid_parent' using errcode = '22023';
  end if;

  if v_learner_first is null or v_learner_last is null or v_school is null then
    raise exception 'invalid_learner' using errcode = '22023';
  end if;

  begin
    v_learner_dob := (p_learner->>'dateOfBirth')::date;
  exception
    when others then
      raise exception 'invalid_date_of_birth' using errcode = '22023';
  end;

  begin
    v_grade := (p_learner->>'grade')::smallint;
  exception
    when others then
      raise exception 'invalid_grade' using errcode = '22023';
  end;

  perform validate_application_payload(p_province, p_subjects, p_package_id, v_grade);

  insert into parents (first_name, last_name, email, phone, address, province)
  values (
    v_parent_first,
    v_parent_last,
    v_parent_email,
    v_parent_phone,
    nullif(trim(p_parent->>'address'), ''),
    p_province
  )
  returning id into v_parent_id;

  insert into learners (parent_id, first_name, last_name, date_of_birth, school_name, grade, level)
  values (
    v_parent_id,
    v_learner_first,
    v_learner_last,
    v_learner_dob,
    v_school,
    v_grade,
    v_level
  )
  returning id into v_learner_id;

  insert into applications (
    parent_id,
    learner_id,
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
    p_province,
    p_subjects,
    p_package_id,
    coalesce(p_schedule, '{}'::jsonb),
    nullif(trim(p_report_url), ''),
    nullif(trim(p_payment_proof_url), ''),
    p_parent,
    p_learner
  )
  returning id into v_app_id;

  return v_app_id;
end;
$$;

create or replace function submit_contact_message(
  p_name text,
  p_email text,
  p_phone text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
  v_email text;
  v_message text;
begin
  v_name := nullif(trim(p_name), '');
  v_email := nullif(trim(lower(p_email)), '');
  v_message := nullif(trim(p_message), '');

  if v_name is null or v_email is null or v_message is null then
    raise exception 'invalid_contact_message' using errcode = '22023';
  end if;

  if length(v_message) > 5000 then
    raise exception 'message_too_long' using errcode = '22023';
  end if;

  insert into contact_messages (name, email, phone, message)
  values (v_name, v_email, nullif(trim(p_phone), ''), v_message)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function submit_application(jsonb, jsonb, text, text[], text, jsonb, text, text) from public;
revoke all on function submit_contact_message(text, text, text, text) from public;

grant execute on function submit_application(
  jsonb, jsonb, text, text[], text, jsonb, text, text
) to anon, authenticated, service_role;

grant execute on function submit_contact_message(text, text, text, text)
  to anon, authenticated, service_role;

-- RLS
alter table profiles enable row level security;
alter table parents enable row level security;
alter table learners enable row level security;
alter table applications enable row level security;
alter table tutors enable row level security;
alter table subscriptions enable row level security;
alter table classes enable row level security;
alter table tutor_timesheets enable row level security;
alter table payments enable row level security;
alter table contact_messages enable row level security;

-- Profiles
create policy profiles_select_own on profiles
  for select to authenticated
  using (id = auth.uid() or is_admin());

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- Parents
create policy parents_admin_all on parents
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy parents_select_own on parents
  for select to authenticated
  using (profile_id = auth.uid());

-- Learners
create policy learners_admin_all on learners
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy learners_select_parent on learners
  for select to authenticated
  using (is_parent_of(parent_id));

-- Applications
create policy applications_admin_all on applications
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy applications_select_parent on applications
  for select to authenticated
  using (is_parent_of(parent_id));

-- Subscriptions, classes, payments (admin + scoped parent reads)
create policy subscriptions_admin_all on subscriptions
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy subscriptions_select_parent on subscriptions
  for select to authenticated
  using (
    exists (
      select 1
      from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_id
        and p.profile_id = auth.uid()
    )
  );

create policy classes_admin_all on classes
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy classes_select_parent on classes
  for select to authenticated
  using (
    exists (
      select 1
      from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_id
        and p.profile_id = auth.uid()
    )
  );

create policy payments_admin_all on payments
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Tutors & timesheets
create policy tutors_admin_all on tutors
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy tutors_select_own on tutors
  for select to authenticated
  using (profile_id = auth.uid());

create policy timesheets_admin_all on tutor_timesheets
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy timesheets_tutor_own on tutor_timesheets
  for all to authenticated
  using (
    exists (
      select 1 from tutors t
      where t.id = tutor_id and t.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from tutors t
      where t.id = tutor_id and t.profile_id = auth.uid()
    )
  );

-- Contact messages: admin read only; public insert via RPC
create policy contact_messages_admin_select on contact_messages
  for select to authenticated
  using (is_admin());

-- Table grants: API roles may access tables subject to RLS (service_role bypasses RLS)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

-- No direct anon table access (applications/contact via RPC only)
revoke all on table parents from anon;
revoke all on table learners from anon;
revoke all on table applications from anon;
revoke all on table tutors from anon;
revoke all on table subscriptions from anon;
revoke all on table classes from anon;
revoke all on table tutor_timesheets from anon;
revoke all on table payments from anon;
revoke all on table contact_messages from anon;
revoke all on table profiles from anon;

-- Seed admin: after creating a user in Supabase Auth Dashboard, run:
-- insert into profiles (id, role, full_name, email)
-- values ('<auth.users.id>', 'admin', 'Sunday Dudula', 'info@ilithiyana.co.za')
-- on conflict (id) do update set role = 'admin';
