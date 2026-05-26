-- Tutor vetting, documents, timesheet line items, admin profiles, tutor-documents storage

do $$ begin
  create type tutor_vetting_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tutor_document_type as enum (
    'id_document',
    'qualification',
    'cv',
    'police_clearance',
    'other'
  );
exception when duplicate_object then null;
end $$;

alter type timesheet_status add value if not exists 'draft';

-- Extended tutor metadata (1:1 with tutors)
create table if not exists tutor_profiles (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null unique references tutors(id) on delete cascade,
  phone text,
  id_number text,
  bio text,
  province text,
  grades_taught smallint[] not null default '{}',
  vetting_status tutor_vetting_status not null default 'pending',
  vetting_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutor_profiles_vetting_idx on tutor_profiles(vetting_status);

create table if not exists tutor_documents (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  document_type tutor_document_type not null,
  storage_path text not null,
  file_name text,
  uploaded_at timestamptz not null default now()
);

create index if not exists tutor_documents_tutor_idx on tutor_documents(tutor_id);

create table if not exists timesheet_sessions (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references tutor_timesheets(id) on delete cascade,
  session_date date not null,
  learner_id uuid references learners(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  subject text,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists timesheet_sessions_timesheet_idx on timesheet_sessions(timesheet_id);

-- PK is profile_id (see 20260529150000); IF NOT EXISTS keeps that shape when both run.
create table if not exists admin_profiles (
  profile_id uuid primary key references profiles(id) on delete cascade,
  title text,
  can_approve_tutors boolean not null default true,
  can_approve_timesheets boolean not null default true,
  can_manage_applications boolean not null default true,
  can_manage_payments boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table admin_profiles
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists is_active boolean not null default true;

-- Columns used by lib/types/tutor-admin.ts and admin tutor actions
alter table tutor_profiles
  add column if not exists qualifications text,
  add column if not exists applied_at timestamptz not null default now(),
  add column if not exists vetted_at timestamptz,
  add column if not exists vetted_by uuid references profiles(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists bank_account_holder text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch_code text,
  add column if not exists id_number text,
  add column if not exists grades_taught smallint[] not null default '{}',
  add column if not exists vetting_notes text,
  add column if not exists onboarding_complete boolean not null default false;

alter table tutor_documents
  add column if not exists mime_type text,
  add column if not exists status text not null default 'pending',
  add column if not exists notes text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null;

alter table tutor_timesheets
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists submitted_at timestamptz;

drop trigger if exists tutor_profiles_updated_at on tutor_profiles;
create trigger tutor_profiles_updated_at
  before update on tutor_profiles
  for each row execute function set_updated_at();

drop trigger if exists admin_profiles_updated_at on admin_profiles;
create trigger admin_profiles_updated_at
  before update on admin_profiles
  for each row execute function set_updated_at();

-- Auth helpers
create or replace function is_tutor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tutors t
    where t.profile_id = auth.uid()
  );
$$;

create or replace function tutor_id_for_auth()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id from tutors t where t.profile_id = auth.uid() limit 1;
$$;

-- Storage: tutor documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutor-documents',
  'tutor-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists tutor_documents_service_all on storage.objects;
drop policy if exists tutor_documents_tutor_insert on storage.objects;
drop policy if exists tutor_documents_tutor_select on storage.objects;
drop policy if exists tutor_documents_admin_select on storage.objects;

create policy tutor_documents_service_all on storage.objects
  for all
  to service_role
  using (bucket_id = 'tutor-documents')
  with check (bucket_id = 'tutor-documents');

create policy tutor_documents_tutor_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tutor-documents'
    and (storage.foldername(name))[1] = tutor_id_for_auth()::text
  );

create policy tutor_documents_tutor_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'tutor-documents'
    and (
      is_admin()
      or (storage.foldername(name))[1] = tutor_id_for_auth()::text
    )
  );

create policy tutor_documents_admin_select on storage.objects
  for select
  to authenticated
  using (bucket_id = 'tutor-documents' and is_admin());

-- RLS
alter table tutor_profiles enable row level security;
alter table tutor_documents enable row level security;
alter table timesheet_sessions enable row level security;
alter table admin_profiles enable row level security;

drop policy if exists tutor_profiles_admin_all on tutor_profiles;
drop policy if exists tutor_profiles_tutor_select on tutor_profiles;
drop policy if exists tutor_profiles_tutor_update on tutor_profiles;

create policy tutor_profiles_admin_all on tutor_profiles
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy tutor_profiles_tutor_select on tutor_profiles
  for select to authenticated
  using (
    exists (
      select 1 from tutors t
      where t.id = tutor_id and t.profile_id = auth.uid()
    )
  );

create policy tutor_profiles_tutor_update on tutor_profiles
  for update to authenticated
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

drop policy if exists tutor_documents_admin_all on tutor_documents;
drop policy if exists tutor_documents_tutor_all on tutor_documents;

create policy tutor_documents_admin_all on tutor_documents
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy tutor_documents_tutor_all on tutor_documents
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

drop policy if exists timesheet_sessions_admin_all on timesheet_sessions;
drop policy if exists timesheet_sessions_tutor_all on timesheet_sessions;

create policy timesheet_sessions_admin_all on timesheet_sessions
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy timesheet_sessions_tutor_all on timesheet_sessions
  for all to authenticated
  using (
    exists (
      select 1
      from tutor_timesheets ts
      join tutors t on t.id = ts.tutor_id
      where ts.id = timesheet_id and t.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from tutor_timesheets ts
      join tutors t on t.id = ts.tutor_id
      where ts.id = timesheet_id and t.profile_id = auth.uid()
    )
  );

drop policy if exists admin_profiles_admin_all on admin_profiles;
drop policy if exists admin_profiles_self_select on admin_profiles;
drop policy if exists admin_profiles_select_own on admin_profiles;

create policy admin_profiles_admin_all on admin_profiles
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy admin_profiles_self_select on admin_profiles
  for select to authenticated
  using (profile_id = auth.uid());

grant select, insert, update, delete on tutor_profiles to authenticated, service_role;
grant select, insert, update, delete on tutor_documents to authenticated, service_role;
grant select, insert, update, delete on timesheet_sessions to authenticated, service_role;
grant select, insert, update, delete on admin_profiles to authenticated, service_role;

revoke all on tutor_profiles from anon;
revoke all on tutor_documents from anon;
revoke all on timesheet_sessions from anon;
revoke all on admin_profiles from anon;
