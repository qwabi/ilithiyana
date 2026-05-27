-- Allow parents to delete their learner's reports (cascade handled in app via service role).

drop policy if exists learner_reports_parent_delete on learner_reports;
create policy learner_reports_parent_delete on learner_reports
  for delete to authenticated
  using (
    is_admin()
    or exists (
      select 1 from learners l
      join parents p on p.id = l.parent_id
      where l.id = learner_reports.learner_id
        and p.profile_id = auth.uid()
    )
  );

grant delete on learner_reports to authenticated;
