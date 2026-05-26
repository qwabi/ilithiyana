-- Tutor vetting, document storage, detailed timesheet sessions, admin profiles
-- Extends existing tutors + tutor_timesheets (Wave 1) without recreating them.

-- Enums
do $$ begin
  create type tutor_vetting_status as enum (
    'pending',
    'documents_submitted',
    'approved',
    'rejected',
    'suspended'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tutor_document_type as enum (
    'id_document',
    'qualification',
    'cv',
    'contract',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type tutor_document_status as enum (
    'pending',
    'verified',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

-- Extended tutor onboarding / vetting (1:1 with tutors)
create table if not exists tutor_profiles (
  tutor_id uuid primary key references tutors(id) on delete cascade,
  vetting_status tutor_vetting_status not null default 'pending',
  bio text,
  qualifications text,
  phone text,
  province text,
  bank_account_holder text,
  bank_name text,
  bank_account_number text,
  bank_branch_code text,
  applied_at timestamptz not null default now(),
  vetted_at timestamptz,
  vetted_by uuid references profiles(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutor_profiles_vetting_status_idx
  on tutor_profiles (vetting_status);

-- Compliance documents (storage path in tutor-documents bucket)
create table if not exists tutor_documents (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  document_type tutor_document_type not null default 'other',
  storage_path text not null,
  file_name text,
  mime_type text,
  status tutor_document_status not null default 'pending',
  notes text,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null
);

create index if not exists tutor_documents_tutor_idx on tutor_documents (tutor_id);
create index if not exists tutor_documents_status_idx on tutor_documents (status);

-- Admin metadata (1:1 with profiles where role = admin)
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

-- Timesheet period bounds (26th–25th billing cycle) + line-item sessions
alter table tutor_timesheets
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists submitted_at timestamptz;

update tutor_timesheets
set submitted_at = created_at
where submitted_at is null;

create table if not exists timesheet_sessions (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references tutor_timesheets(id) on delete cascade,
  session_date date not null,
  class_id uuid references classes(id) on delete set null,
  subject text,
  learner_count smallint not null default 1 check (learner_count >= 0),
  duration_minutes smallint not null default 60 check (duration_minutes > 0),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists timesheet_sessions_timesheet_idx
  on timesheet_sessions (timesheet_id);

create index if not exists timesheet_sessions_date_idx
  on timesheet_sessions (session_date);

-- Backfill tutor_profiles for existing tutors
insert into tutor_profiles (tutor_id, vetting_status, vetted_at)
select t.id, 'approved', now()
from tutors t
where not exists (
  select 1 from tutor_profiles tp where tp.tutor_id = t.id
);

-- updated_at triggers
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
    select 1
    from profiles p
    join tutors t on t.profile_id = p.id
    where p.id = auth.uid()
      and p.role = 'tutor'
  );
$$;

create or replace function current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from tutors t
  where t.profile_id = auth.uid()
  limit 1;
$$;

create or replace function tutor_is_approved(p_tutor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from tutor_profiles tp
    where tp.tutor_id = p_tutor_id
      and tp.vetting_status = 'approved'
  );
$$;

-- RLS
alter table tutor_profiles enable row level security;
alter table tutor_documents enable row level security;
alter table admin_profiles enable row level security;
alter table timesheet_sessions enable row level security;

-- tutor_profiles
create policy tutor_profiles_admin_all on tutor_profiles
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy tutor_profiles_select_own on tutor_profiles
  for select to authenticated
  using (tutor_id = current_tutor_id());

create policy tutor_profiles_update_own on tutor_profiles
  for update to authenticated
  using (tutor_id = current_tutor_id())
  with check (tutor_id = current_tutor_id());

-- tutor_documents
create policy tutor_documents_admin_all on tutor_documents
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy tutor_documents_tutor_own on tutor_documents
  for all to authenticated
  using (tutor_id = current_tutor_id())
  with check (tutor_id = current_tutor_id());

-- admin_profiles
create policy admin_profiles_admin_all on admin_profiles
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy admin_profiles_select_own on admin_profiles
  for select to authenticated
  using (profile_id = auth.uid());

-- timesheet_sessions
create policy timesheet_sessions_admin_all on timesheet_sessions
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy timesheet_sessions_tutor_own on timesheet_sessions
  for all to authenticated
  using (
    exists (
      select 1
      from tutor_timesheets tt
      join tutors t on t.id = tt.tutor_id
      where tt.id = timesheet_id
        and t.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from tutor_timesheets tt
      join tutors t on t.id = tt.tutor_id
      where tt.id = timesheet_id
        and t.profile_id = auth.uid()
    )
  );

-- Tutors may insert/update own timesheets when approved
drop policy if exists timesheets_tutor_insert on tutor_timesheets;
create policy timesheets_tutor_insert on tutor_timesheets
  for insert to authenticated
  with check (
    exists (
      select 1 from tutors t
      where t.id = tutor_id
        and t.profile_id = auth.uid()
        and tutor_is_approved(t.id)
    )
  );

drop policy if exists timesheets_tutor_update_own on tutor_timesheets;
create policy timesheets_tutor_update_own on tutor_timesheets
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

-- Storage: tutor-documents bucket
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
drop policy if exists tutor_documents_admin_select on storage.objects;
drop policy if exists tutor_documents_tutor_own on storage.objects;

create policy tutor_documents_service_all on storage.objects
  for all to service_role
  using (bucket_id = 'tutor-documents')
  with check (bucket_id = 'tutor-documents');

create policy tutor_documents_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'tutor-documents' and public.is_admin());

create policy tutor_documents_tutor_own on storage.objects
  for all to authenticated
  using (
    bucket_id = 'tutor-documents'
    and (storage.foldername(name))[1] = public.current_tutor_id()::text
  )
  with check (
    bucket_id = 'tutor-documents'
    and (storage.foldername(name))[1] = public.current_tutor_id()::text
  );

grant select, insert, update, delete on tutor_profiles, tutor_documents, admin_profiles, timesheet_sessions to authenticated;
grant all on tutor_profiles, tutor_documents, admin_profiles, timesheet_sessions to service_role;

revoke all on tutor_profiles from anon;
revoke all on tutor_documents from anon;
revoke all on admin_profiles from anon;
revoke all on timesheet_sessions from anon;
