-- Parents can read shared group classes (learner_id null) when the child is actively enrolled.

create policy classes_select_parent_via_enrollment on public.classes
  for select to authenticated
  using (
    exists (
      select 1
      from public.class_enrollments ce
      join public.learners l on l.id = ce.learner_id
      join public.parents p on p.id = l.parent_id
      where ce.class_id = classes.id
        and ce.status = 'active'
        and p.profile_id = auth.uid()
    )
  );
