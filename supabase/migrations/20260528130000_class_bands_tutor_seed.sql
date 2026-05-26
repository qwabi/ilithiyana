-- Class bands, nullable learner_id on group classes, tutor seed, group class seed, enrollment backfill

-- 1. Band column on classes (shared group model)
alter table public.classes
  add column if not exists band text;

do $$ begin
  alter table public.classes
    add constraint classes_band_check check (band is null or band in ('A', 'B', 'C', 'D'));
exception when duplicate_object then null;
end $$;

-- 2. Group classes: learner_id optional (legacy per-learner rows may keep learner_id)
alter table public.classes alter column learner_id drop not null;

-- 3. Unique shared class groups per grade + subject + band (null learner_id)
create unique index if not exists classes_group_grade_subject_band_uidx
  on public.classes (grade, subject, band)
  where learner_id is null and band is not null;

-- 4. Migrate legacy per-learner class rows into class_enrollments
insert into public.class_enrollments (class_id, learner_id, status)
select c.id, c.learner_id, 'active'
from public.classes c
where c.learner_id is not null
on conflict (learner_id, class_id) do nothing;

-- 5. Seed default tutor (Masande Dudula) — requires auth.users row
do $$
declare
  v_user_id uuid;
  v_tutor_id uuid;
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
    raise notice 'Masande auth user not found. Create the account in Supabase Auth first.';
    return;
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (v_user_id, 'admin', 'Masande Dudula', 'masande@ilithiyana.co.za')
  on conflict (id) do update
    set role = 'admin',
        full_name = 'Masande Dudula';

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
end;
$$;

-- 6. Seed shared class groups (grades 6–12, bands A–D)
do $$
declare
  v_tutor_id uuid;
  v_grade int;
  v_band text;
  v_subject text;
  v_bands text[] := array['A', 'B', 'C', 'D'];
  v_subjects text[] := array['Pure Maths', 'Physical Science', 'Life Sciences', 'English', 'Natural Sciences'];
begin
  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.co.za';

  if v_tutor_id is null then
    raise notice 'Default tutor not found; skip class group seed.';
    return;
  end if;

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
end;
$$;

-- 7. Backfill class_enrollments for learners with applications but no enrollment
do $$
declare
  v_tutor_id uuid;
  rec record;
  subj text;
  v_band text;
  v_class_id uuid;
begin
  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.co.za';

  if v_tutor_id is null then
    raise notice 'Seed tutor first; skip enrollment backfill.';
    return;
  end if;

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
