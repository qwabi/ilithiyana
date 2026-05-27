-- Parents: allow deleting related rows when removing a report (app uses service role; grants for direct client fallback).

grant delete on report_extractions to authenticated;
grant delete on learner_subject_levels to authenticated;
grant update on class_enrollments to authenticated;

drop policy if exists learner_subject_levels_parent_delete on learner_subject_levels;
create policy learner_subject_levels_parent_delete on learner_subject_levels
  for delete to authenticated
  using (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_subject_levels.learner_id
        and p.profile_id = auth.uid()
    )
  );

drop policy if exists class_enrollments_parent_update on class_enrollments;
create policy class_enrollments_parent_update on class_enrollments
  for update to authenticated
  using (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = class_enrollments.learner_id
        and p.profile_id = auth.uid()
    )
  )
  with check (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = class_enrollments.learner_id
        and p.profile_id = auth.uid()
    )
  );

drop policy if exists learner_level_change_alerts_parent_delete on learner_level_change_alerts;
create policy learner_level_change_alerts_parent_delete on learner_level_change_alerts
  for delete to authenticated
  using (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_level_change_alerts.learner_id
        and p.profile_id = auth.uid()
    )
  );
