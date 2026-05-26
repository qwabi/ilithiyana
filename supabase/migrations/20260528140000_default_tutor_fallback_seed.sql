-- Seed default tutor (Masande email) with auth fallback; seed class groups; backfill enrollments.
-- Idempotent — safe to run twice.

do $$
declare
  v_user_id uuid;
  v_tutor_id uuid;
  v_grade int;
  v_band text;
  v_subject text;
  v_bands text[] := array['A', 'B', 'C', 'D'];
  v_subjects text[] := array['Pure Maths', 'Physical Science', 'Life Sciences', 'English', 'Natural Sciences'];
  rec record;
  subj text;
  v_class_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'masande@ilithiyana.co.za'
  limit 1;

  if v_user_id is null then
    select id into v_user_id
    from auth.users
    where email = 'masande@ilithiyana.com'
    limit 1;
  end if;

  if v_user_id is null then
    select id into v_user_id
    from auth.users
    where email = 'benn@qwabi.co.za'
    limit 1;
    raise notice 'Masande auth user not found; using fallback auth user %', v_user_id;
  end if;

  if v_user_id is null then
    raise notice 'No auth user for tutor seed; skipping.';
    return;
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (v_user_id, 'admin', 'Masande Dudula', 'masande@ilithiyana.co.za')
  on conflict (id) do update
    set role = 'admin',
        full_name = coalesce(profiles.full_name, 'Masande Dudula');

  insert into public.tutors (profile_id, first_name, last_name, email, subjects, session_rate_cents)
  values (
    v_user_id,
    'Masande',
    'Dudula',
    'masande@ilithiyana.co.za',
    array['Pure Maths', 'Physical Science', 'Life Sciences', 'English', 'Natural Sciences'],
    20000
  )
  on conflict (email) do update
    set profile_id = excluded.profile_id,
        subjects = excluded.subjects,
        session_rate_cents = excluded.session_rate_cents;

  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.co.za';
  raise notice 'Default tutor id: %', v_tutor_id;

  for v_grade in 6..12 loop
    foreach v_subject in array v_subjects loop
      if v_subject = 'Natural Sciences' and v_grade >= 10 then
        continue;
      end if;
      if v_subject = 'Physical Science' and v_grade < 10 then
        continue;
      end if;

      foreach v_band in array v_bands loop
        insert into public.classes (
          tutor_id, subject, grade, band, level, schedule, meet_link, learner_id
        )
        select
          v_tutor_id,
          v_subject,
          v_grade,
          v_band,
          case v_band
            when 'A' then 'Level 1'
            when 'B' then 'Level 2-3'
            when 'C' then 'Level 4-5'
            when 'D' then 'Level 6-7'
          end,
          'TBC',
          null,
          null
        where not exists (
          select 1 from public.classes c
          where c.grade = v_grade
            and c.subject = v_subject
            and c.band = v_band
            and c.learner_id is null
        );
      end loop;
    end loop;
  end loop;

  raise notice 'Class groups seeded.';

  for rec in
    select
      l.id as learner_id,
      l.grade,
      l.level,
      a.subjects
    from public.learners l
    join public.applications a on a.learner_id = l.id
    where a.subjects is not null
      and cardinality(a.subjects) > 0
      and not exists (
        select 1 from public.class_enrollments ce where ce.learner_id = l.id
      )
  loop
    v_band := case
      when rec.level ilike '%1%' then 'A'
      when rec.level ilike '%2%' or rec.level ilike '%3%' then 'B'
      when rec.level ilike '%4%' or rec.level ilike '%5%' then 'C'
      when rec.level ilike '%6%' or rec.level ilike '%7%' then 'D'
      else 'B'
    end;

    foreach subj in array rec.subjects loop
      select id into v_class_id
      from public.classes
      where grade = rec.grade
        and subject = subj
        and band = v_band
        and learner_id is null
      limit 1;

      if v_class_id is null then
        select id into v_class_id
        from public.classes
        where grade = rec.grade and subject = subj and learner_id is null
        limit 1;
      end if;

      if v_class_id is null then
        insert into public.classes (tutor_id, subject, grade, band, level, schedule, learner_id)
        values (v_tutor_id, subj, rec.grade, v_band, rec.level, 'TBC', null)
        returning id into v_class_id;
      end if;

      if v_class_id is not null then
        insert into public.class_enrollments (class_id, learner_id, status)
        values (v_class_id, rec.learner_id, 'active')
        on conflict (learner_id, class_id) do nothing;
      end if;
    end loop;
  end loop;

  raise notice 'Enrollment backfill complete.';
end;
$$;
