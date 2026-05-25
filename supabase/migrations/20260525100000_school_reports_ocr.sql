-- School report OCR, level extraction, and class allocation

do $$ begin
  create type ocr_status as enum ('pending', 'processing', 'complete', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type allocation_status as enum (
    'pending_report',
    'pending_confirmation',
    'allocating',
    'enrolled',
    'waitlisted',
    'manual'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type level_change_severity as enum ('watch', 'urgent', 'positive');
exception when duplicate_object then null;
end $$;

-- Class catalog: nullable learner_id = catalog offering; non-null = legacy direct row
alter table classes
  alter column learner_id drop not null;

alter table classes
  add column if not exists band text check (band is null or band in ('A', 'B', 'C', 'D')),
  add column if not exists subject_code text,
  add column if not exists max_enrollment integer not null default 3 check (max_enrollment >= 1),
  add column if not exists class_label text;

create index if not exists classes_catalog_idx on classes (grade, band, subject)
  where learner_id is null;

alter table applications
  add column if not exists allocation_status allocation_status default 'pending_report',
  add column if not exists report_storage_path text;

alter table learners
  add column if not exists allocation_status allocation_status default 'pending_report';

-- Reports
create table if not exists learner_reports (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  uploaded_by uuid references profiles(id) on delete set null,
  file_url text not null,
  file_type text not null check (file_type in ('pdf', 'jpg', 'jpeg', 'png', 'webp')),
  term text not null default 'Year End',
  academic_year integer not null default extract(year from current_date)::integer,
  ocr_status ocr_status not null default 'pending',
  ocr_raw_text text,
  ocr_completed_at timestamptz,
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  confirmed_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  notes text
);

create table if not exists report_extractions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references learner_reports(id) on delete cascade,
  subject_name_raw text not null,
  subject_name_clean text,
  percentage numeric(5,2),
  level smallint check (level is null or level between 1 and 7),
  band text check (band is null or band in ('A', 'B', 'C', 'D')),
  term text,
  confidence numeric(3,2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  needs_review boolean not null default false,
  is_offered boolean not null default true,
  parent_corrected boolean not null default false,
  original_percentage numeric(5,2),
  created_at timestamptz not null default now()
);

create table if not exists learner_subject_levels (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  subject text not null,
  level smallint not null check (level between 1 and 7),
  band text not null check (band in ('A', 'B', 'C', 'D')),
  percentage numeric(5,2),
  term text not null,
  academic_year integer not null,
  source_report_id uuid references learner_reports(id) on delete set null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (learner_id, subject, term, academic_year)
);

create table if not exists class_waitlist (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  subject text not null,
  grade smallint not null,
  band text not null check (band in ('A', 'B', 'C', 'D')),
  class_label text,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  notes text
);

create table if not exists learner_level_change_alerts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references learners(id) on delete cascade,
  subject text not null,
  previous_band text not null,
  new_band text not null,
  severity level_change_severity not null,
  term text not null,
  academic_year integer not null,
  source_report_id uuid references learner_reports(id) on delete set null,
  acknowledged_at timestamptz,
  acknowledged_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists learner_reports_learner_idx on learner_reports (learner_id);
create index if not exists learner_reports_ocr_status_idx on learner_reports (ocr_status);
create index if not exists report_extractions_report_idx on report_extractions (report_id);
create index if not exists learner_subject_levels_learner_idx on learner_subject_levels (learner_id);
create index if not exists class_waitlist_learner_idx on class_waitlist (learner_id);

-- Count active enrollments per catalog class
create or replace function class_enrollment_count(p_class_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from class_enrollments ce
  where ce.class_id = p_class_id
    and ce.status = 'active';
$$;

-- RLS
alter table learner_reports enable row level security;
alter table report_extractions enable row level security;
alter table learner_subject_levels enable row level security;
alter table class_waitlist enable row level security;
alter table learner_level_change_alerts enable row level security;

create policy learner_reports_parent_select on learner_reports
  for select to authenticated
  using (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_reports.learner_id
        and p.profile_id = auth.uid()
    )
  );

create policy learner_reports_parent_insert on learner_reports
  for insert to authenticated
  with check (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_reports.learner_id
        and p.profile_id = auth.uid()
    )
  );

create policy learner_reports_admin_all on learner_reports
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy report_extractions_parent_select on report_extractions
  for select to authenticated
  using (
    is_admin()
    or exists (
      select 1 from learner_reports lr
      join learners l on l.id = lr.learner_id
      join parents p on p.id = l.parent_id
      where lr.id = report_extractions.report_id
        and p.profile_id = auth.uid()
    )
  );

create policy report_extractions_admin_all on report_extractions
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy learner_subject_levels_parent_select on learner_subject_levels
  for select to authenticated
  using (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_subject_levels.learner_id
        and p.profile_id = auth.uid()
    )
  );

create policy learner_subject_levels_admin_all on learner_subject_levels
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy class_waitlist_admin_all on class_waitlist
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy level_change_alerts_admin_all on learner_level_change_alerts
  for all to authenticated
  using (is_admin())
  with check (is_admin());

create policy level_change_alerts_tutor_select on learner_level_change_alerts
  for select to authenticated
  using (
    exists (
      select 1 from tutors t
      where t.profile_id = auth.uid()
    )
  );

grant select, insert, update on learner_reports to authenticated;
grant select on report_extractions to authenticated;
grant select on learner_subject_levels to authenticated;
grant all on learner_reports, report_extractions, learner_subject_levels,
  class_waitlist, learner_level_change_alerts to service_role;
