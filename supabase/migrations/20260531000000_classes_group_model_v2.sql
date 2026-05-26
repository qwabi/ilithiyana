-- Classes group model v2: structured schedule, band labels, max enrollment, Masande provisioning

-- Step 1 — Add missing columns to classes
alter table public.classes
  add column if not exists schedule_day text,
  add column if not exists schedule_time text,
  add column if not exists max_enrollment integer not null default 8,
  add column if not exists is_active boolean not null default true,
  add column if not exists band_label text;

do $$ begin
  alter table public.classes
    add constraint classes_schedule_day_check
    check (schedule_day is null or schedule_day in (
      'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
    ));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.classes
    add constraint classes_max_enrollment_check
    check (max_enrollment between 1 and 8);
exception when duplicate_object then null;
end $$;

alter table public.classes alter column max_enrollment set default 8;

-- Normalize schedule_time to text HH:MM (legacy column was time without time zone)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'classes'
      and column_name = 'schedule_time'
      and udt_name = 'time'
  ) then
    alter table public.classes
      alter column schedule_time type text
      using to_char(schedule_time::time, 'HH24:MI');
  end if;
end $$;

-- Step 2 — Backfill schedule_day and schedule_time from free-text schedule
update public.classes
set
  schedule_day = case
    when schedule ilike 'mon%' then 'monday'
    when schedule ilike 'tue%' then 'tuesday'
    when schedule ilike 'wed%' then 'wednesday'
    when schedule ilike 'thu%' then 'thursday'
    when schedule ilike 'fri%' then 'friday'
    when schedule ilike 'sat%' then 'saturday'
    when subject = 'Pure Maths' or subject = 'Pure Mathematics' then 'tuesday'
    when subject = 'Natural Sciences' then 'monday'
    when subject = 'English' then 'wednesday'
    when subject = 'Physical Science' or subject = 'Physical Sciences' then 'thursday'
    when subject = 'Life Sciences' then 'friday'
    else 'tuesday'
  end,
  schedule_time = case
    when schedule ~ '[0-9]{2}:[0-9]{2}' then
      substring(schedule from '[0-9]{2}:[0-9]{2}')
    when schedule_time is not null and schedule_time <> '' then schedule_time
    else '18:00'
  end
where schedule_day is null;

-- Step 3 — Backfill band_label
update public.classes
set band_label = case band
  when 'A' then 'Foundation (Level 1)'
  when 'B' then 'Developing (Levels 2-3)'
  when 'C' then 'Competent (Levels 4-5)'
  when 'D' then 'Advanced (Levels 6-7)'
  else band
end
where band_label is null and band is not null;

-- Step 4 — Ensure seeded class groups are active
update public.classes
set is_active = true
where learner_id is null;

-- Step 5 — Verify unique constraint on class_enrollments
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'class_enrollments_learner_id_class_id_key'
  ) then
    alter table public.class_enrollments
      add constraint class_enrollments_learner_id_class_id_key
      unique (learner_id, class_id);
  end if;
end $$;

-- Step 6 — RLS: tutors can read assigned classes
drop policy if exists classes_select_tutor on public.classes;
create policy classes_select_tutor on public.classes
  for select to authenticated
  using (
    exists (
      select 1 from public.tutors t
      where t.id = classes.tutor_id
        and t.profile_id = auth.uid()
    )
  );

-- Step 7 — Provision Masande as admin + tutor (idempotent)
do $$
declare
  v_user_id uuid;
  v_tutor_id uuid;
begin
  select id into v_user_id from auth.users
  where email in ('masande@ilithiyana.com', 'masande@ilithiyana.co.za')
  order by created_at asc
  limit 1;

  if v_user_id is null then
    raise notice 'Masande auth user not found. Create in Supabase Auth first, then re-run.';
    raise notice 'Email: masande@ilithiyana.com, Role: admin+tutor';
    return;
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (v_user_id, 'admin', 'Masande Dudula', 'masande@ilithiyana.com')
  on conflict (id) do update
    set role = 'admin',
        full_name = 'Masande Dudula',
        email = 'masande@ilithiyana.com';

  insert into public.tutors (profile_id, first_name, last_name, email, subjects, session_rate_cents)
  values (
    v_user_id, 'Masande', 'Dudula', 'masande@ilithiyana.com',
    array['Pure Maths', 'Physical Science', 'Life Sciences', 'English', 'Natural Sciences'],
    20000
  )
  on conflict (email) do update
    set profile_id = excluded.profile_id,
        first_name = 'Masande',
        last_name = 'Dudula',
        subjects = excluded.subjects;

  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.com';

  if v_tutor_id is null then
    select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.co.za';
  end if;

  if v_tutor_id is not null then
    insert into public.tutor_profiles (tutor_id, vetting_status, onboarding_complete, vetted_at)
    values (v_tutor_id, 'approved', true, now())
    on conflict (tutor_id) do update
      set vetting_status = 'approved',
          onboarding_complete = true,
          vetted_at = coalesce(tutor_profiles.vetted_at, now());

    update public.classes
    set tutor_id = v_tutor_id
    where tutor_id is null;
  end if;

  insert into public.admin_profiles (profile_id, is_active, full_name, email)
  values (v_user_id, true, 'Masande Dudula', 'masande@ilithiyana.com')
  on conflict (profile_id) do update
    set is_active = true,
        full_name = 'Masande Dudula',
        email = 'masande@ilithiyana.com';

  raise notice 'Masande provisioned. tutor_id: %', v_tutor_id;
end;
$$;

-- Step 8 — Backfill class groups (grades 6–12 × subjects × bands A–D)
do $$
declare
  v_tutor_id uuid;
  v_grade int;
  v_band text;
  v_subject text;
  v_bands text[] := array['A','B','C','D'];
  v_subjects text[] := array['Pure Maths','Physical Science','Life Sciences','English','Natural Sciences'];
begin
  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.com';
  if v_tutor_id is null then
    select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.co.za';
  end if;

  if v_tutor_id is null then
    raise notice 'Masande tutor not found; skip class group seed.';
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
            when 'Pure Maths' then 'tuesday'
            when 'Pure Mathematics' then 'tuesday'
            when 'Natural Sciences' then 'monday'
            when 'English' then 'wednesday'
            when 'Physical Science' then 'thursday'
            when 'Physical Sciences' then 'thursday'
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

  raise notice 'Class groups backfill done.';
end;
$$;
