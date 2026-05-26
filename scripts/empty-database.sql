-- Empty application data (rows only — tables, enums, and packages catalog stay).
-- Prefer: npm run db:empty -- --confirm
-- Or paste this in the Supabase SQL editor after reviewing.

begin;

truncate table
  public.session_attendance,
  public.class_sessions,
  public.class_enrollments,
  public.learner_level_change_alerts,
  public.class_waitlist,
  public.report_extractions,
  public.learner_subject_levels,
  public.learner_reports,
  public.payments,
  public.tutor_timesheets,
  public.subscriptions,
  public.applications,
  public.enrollment_leads,
  public.onboarding_sessions,
  public.classes,
  public.learners,
  public.parents,
  public.tutors,
  public.contact_messages,
  public.profiles
restart identity cascade;

do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'prospective_leads'
  ) then
    truncate table public.prospective_leads restart identity cascade;
  end if;
end $$;

-- packages catalog is intentionally not truncated

commit;
