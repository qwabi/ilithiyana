-- Idempotent: manual report entry stores null file_url (no upload).

alter table learner_reports
  alter column file_url drop not null;

alter table learner_reports
  drop constraint if exists learner_reports_file_type_check;

alter table learner_reports
  add constraint learner_reports_file_type_check
  check (file_type in ('pdf', 'jpg', 'jpeg', 'png', 'webp', 'manual'));
