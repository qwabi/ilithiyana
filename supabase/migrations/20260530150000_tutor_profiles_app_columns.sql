-- Columns expected by app code but missing when tutor_profiles was created by 20260529150000
-- (20260530120000 CREATE TABLE IF NOT EXISTS did not alter the existing table).

alter table tutor_profiles
  add column if not exists id_number text,
  add column if not exists grades_taught smallint[] not null default '{}',
  add column if not exists vetting_notes text,
  add column if not exists onboarding_complete boolean not null default false;

-- Optional row id for APIs/types that expect tutor_profiles.id (harmless if unused)
alter table tutor_profiles
  add column if not exists id uuid default gen_random_uuid();

update tutor_profiles set id = gen_random_uuid() where id is null;

create unique index if not exists tutor_profiles_id_uidx on tutor_profiles (id);

-- Align vetting_notes with legacy rejection_reason where present
update tutor_profiles
set vetting_notes = rejection_reason
where vetting_notes is null and rejection_reason is not null;

-- police_clearance document type (signup form)
do $$ begin
  alter type tutor_document_type add value 'police_clearance';
exception
  when duplicate_object then null;
end $$;
