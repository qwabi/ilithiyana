-- Align group classes with CAPS Senior Phase (6–9) vs FET (10–12) subject offerings.

-- Deactivate group classes for subjects outside the correct phase.
update public.classes
set is_active = false
where learner_id is null
  and (
  -- Senior Phase: no Life Sciences or Physical Science
    (grade between 6 and 9 and subject in (
      'Life Sciences',
      'Physical Science',
      'Physical Sciences'
    ))
    or
  -- FET: no Natural Sciences
    (grade between 10 and 12 and subject in (
      'Natural Sciences',
      'Natural Science'
    ))
  );

-- Seed missing Senior Phase group classes (grades 6–9 × offered junior subjects × bands A–D).
do $$
declare
  v_tutor_id uuid;
  v_grade int;
  v_band text;
  v_subject text;
  v_bands text[] := array['A','B','C','D'];
  v_senior_subjects text[] := array[
    'English',
    'Pure Maths',
    'Natural Sciences',
    'Social Sciences',
    'Technology',
    'Economic Management Sciences',
    'Life Orientation',
    'Creative Arts'
  ];
begin
  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.com';
  if v_tutor_id is null then
    select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.co.za';
  end if;
  if v_tutor_id is null then
    raise notice 'No default tutor; skip senior phase class seed.';
    return;
  end if;

  for v_grade in 6..9 loop
    foreach v_subject in array v_senior_subjects loop
      foreach v_band in array v_bands loop
        insert into public.classes (
          tutor_id, subject, grade, band, band_label, max_enrollment,
          schedule_day, schedule_time, is_active, learner_id
        )
        select
          v_tutor_id,
          v_subject,
          v_grade,
          v_band,
          case v_band
            when 'A' then 'Foundation (Level 1)'
            when 'B' then 'Developing (Levels 2-3)'
            when 'C' then 'Competent (Levels 4-5)'
            when 'D' then 'Advanced (Levels 6-7)'
          end,
          8,
          case v_subject
            when 'English' then 'wednesday'
            when 'Pure Maths' then 'tuesday'
            when 'Natural Sciences' then 'monday'
            when 'Social Sciences' then 'thursday'
            when 'Technology' then 'friday'
            when 'Economic Management Sciences' then 'monday'
            when 'Life Orientation' then 'saturday'
            when 'Creative Arts' then 'saturday'
            else 'tuesday'
          end,
          case v_subject
            when 'Economic Management Sciences' then '17:00'
            when 'Life Orientation' then '10:00'
            when 'Creative Arts' then '11:00'
            else '18:00'
          end,
          true,
          null
        where not exists (
          select 1 from public.classes c2
          where c2.grade = v_grade
            and c2.subject = v_subject
            and c2.band = v_band
            and c2.learner_id is null
        );
      end loop;
    end loop;
  end loop;

  raise notice 'Senior phase class groups seeded.';
end;
$$;

-- Ensure FET group classes exist (grades 10–12; no Natural Sciences).
do $$
declare
  v_tutor_id uuid;
  v_grade int;
  v_band text;
  v_subject text;
  v_bands text[] := array['A','B','C','D'];
  v_fet_subjects text[] := array[
    'English',
    'Pure Maths',
    'Physical Science',
    'Life Sciences'
  ];
begin
  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.com';
  if v_tutor_id is null then
    select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.co.za';
  end if;
  if v_tutor_id is null then
    raise notice 'No default tutor; skip FET class seed.';
    return;
  end if;

  for v_grade in 10..12 loop
    foreach v_subject in array v_fet_subjects loop
      foreach v_band in array v_bands loop
        insert into public.classes (
          tutor_id, subject, grade, band, band_label, max_enrollment,
          schedule_day, schedule_time, is_active, learner_id
        )
        select
          v_tutor_id,
          v_subject,
          v_grade,
          v_band,
          case v_band
            when 'A' then 'Foundation (Level 1)'
            when 'B' then 'Developing (Levels 2-3)'
            when 'C' then 'Competent (Levels 4-5)'
            when 'D' then 'Advanced (Levels 6-7)'
          end,
          8,
          case v_subject
            when 'English' then 'wednesday'
            when 'Pure Maths' then 'tuesday'
            when 'Physical Science' then 'thursday'
            when 'Life Sciences' then 'friday'
            else 'tuesday'
          end,
          '18:00',
          true,
          null
        where not exists (
          select 1 from public.classes c2
          where c2.grade = v_grade
            and c2.subject = v_subject
            and c2.band = v_band
            and c2.learner_id is null
        );
      end loop;
    end loop;
  end loop;

  raise notice 'FET class groups seeded.';
end;
$$;
