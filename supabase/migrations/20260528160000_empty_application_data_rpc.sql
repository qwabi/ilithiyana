-- Dev helper: wipe application rows in one transaction (keeps packages catalog).
-- Callable by service_role only.

create or replace function public.empty_application_data(
  p_keep_class_catalog boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counts jsonb := '{}'::jsonb;
  v_n bigint;
begin
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
    public.learners,
    public.parents,
    public.tutors,
    public.contact_messages,
    public.profiles
  restart identity cascade;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'prospective_leads'
  ) then
    truncate table public.prospective_leads restart identity cascade;
  end if;

  if p_keep_class_catalog then
    delete from public.classes where learner_id is not null;
  else
    truncate table public.classes restart identity cascade;
  end if;

  select count(*) into v_n from public.learners;
  v_counts := v_counts || jsonb_build_object('learners', v_n);
  select count(*) into v_n from public.parents;
  v_counts := v_counts || jsonb_build_object('parents', v_n);
  select count(*) into v_n from public.classes;
  v_counts := v_counts || jsonb_build_object('classes', v_n);
  select count(*) into v_n from public.enrollment_leads;
  v_counts := v_counts || jsonb_build_object('enrollment_leads', v_n);

  return jsonb_build_object('ok', true, 'remaining', v_counts);
end;
$$;

revoke all on function public.empty_application_data(boolean) from public;
grant execute on function public.empty_application_data(boolean) to service_role;
