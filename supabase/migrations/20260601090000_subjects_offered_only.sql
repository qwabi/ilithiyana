-- Align offered subjects to the platform-wide canonical list (Section C).
-- Includes backfill + stricter validation for enrollment payloads.

create or replace function normalize_subject_label(p text)
returns text
language sql
immutable
as $$
  select
    case trim(coalesce(p, ''))
      when '' then ''
      -- Legacy / variants → new canonical labels
      when 'Pure Maths' then 'Mathematics'
      when 'Pure Mathematics' then 'Mathematics'
      when 'Mathematics' then 'Mathematics'
      when 'Physical Science' then 'Physical Sciences'
      when 'Physical Sciences' then 'Physical Sciences'
      when 'English' then 'English (H.L & F.A.L)'
      when 'Engineering Graphics and Design' then 'Engineering Graphic Design'
      when 'Technical Sciences' then 'Technical Science'
      else trim(p)
    end;
$$;

-- Backfill: subjects arrays (keep distinct, drop unoffered).
do $$
declare
  allowed text[] := array[
    'Agricultural Sciences',
    'Civil Technology',
    'Coding & Robotics',
    'Electrical Technology',
    'Engineering Graphic Design',
    'English (H.L & F.A.L)',
    'Life Sciences',
    'Mathematics',
    'Mechanical Technology',
    'Natural Sciences',
    'Physical Sciences',
    'Technical Mathematics',
    'Technical Science',
    'Technology'
  ];
begin
  -- learners.subjects
  update learners l
  set subjects = (
    select
      case
        when cardinality(filtered) = 0 then array['Mathematics']
        else filtered
      end
    from (
      select coalesce(array_agg(distinct s2), '{}'::text[]) as filtered
      from unnest(l.subjects) s
      cross join lateral (select normalize_subject_label(s) as s2) n
      where n.s2 = any (allowed)
    ) t
  )
  where l.subjects is not null;

  -- applications.subjects
  update applications a
  set subjects = (
    select
      case
        when cardinality(filtered) = 0 then array['Mathematics']
        else filtered
      end
    from (
      select coalesce(array_agg(distinct s2), '{}'::text[]) as filtered
      from unnest(a.subjects) s
      cross join lateral (select normalize_subject_label(s) as s2) n
      where n.s2 = any (allowed)
    ) t
  )
  where a.subjects is not null;

  -- tutors.subjects
  update tutors t0
  set subjects = (
    select
      case
        when cardinality(filtered) = 0 then array['Mathematics']
        else filtered
      end
    from (
      select coalesce(array_agg(distinct s2), '{}'::text[]) as filtered
      from unnest(t0.subjects) s
      cross join lateral (select normalize_subject_label(s) as s2) n
      where n.s2 = any (allowed)
    ) t
  )
  where t0.subjects is not null;

  -- enrollment_leads.subjects (if table/column exists on this project)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enrollment_leads'
      and column_name = 'subjects'
  ) then
    execute format($sql$
      update enrollment_leads e
      set subjects = (
        select
          case
            when cardinality(filtered) = 0 then array['Mathematics']
            else filtered
          end
        from (
          select coalesce(array_agg(distinct s2), '{}'::text[]) as filtered
          from unnest(e.subjects) s
          cross join lateral (select normalize_subject_label(s) as s2) n
          where n.s2 = any (%L::text[])
        ) t
      )
      where e.subjects is not null;
    $sql$, allowed);
  end if;

  -- Merge duplicate GROUP classes that would collide after normalization.
  -- Unique index: classes_group_grade_subject_band_uidx on (grade, subject, band) where learner_id is null and band is not null.
  -- Strategy:
  -- - compute normalized subject for each group class row
  -- - pick a canonical class_id per (grade, band, normalized_subject)
  -- - repoint dependent rows (enrollments + sessions + waitlist when present)
  -- - delete duplicate class rows
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'class_enrollments'
  ) then
    with group_rows as (
      select
        c.id,
        c.grade,
        c.band,
        case
          when normalize_subject_label(c.subject) = any (allowed) then normalize_subject_label(c.subject)
          else 'Mathematics'
        end as normalized_subject
      from public.classes c
      where c.learner_id is null and c.band is not null
    ),
    winners as (
      select grade, band, normalized_subject, min(id::text)::uuid as keep_id
      from group_rows
      group by grade, band, normalized_subject
    ),
    losers as (
      select g.id as lose_id, w.keep_id
      from group_rows g
      join winners w on w.grade = g.grade and w.band = g.band and w.normalized_subject = g.normalized_subject
      where g.id <> w.keep_id
    )
    insert into public.class_enrollments (learner_id, class_id, enrolled_at, status)
    select ce.learner_id, l.keep_id, ce.enrolled_at, ce.status
    from public.class_enrollments ce
    join losers l on l.lose_id = ce.class_id
    on conflict (learner_id, class_id) do nothing;

    with group_rows as (
      select
        c.id,
        c.grade,
        c.band,
        case
          when normalize_subject_label(c.subject) = any (allowed) then normalize_subject_label(c.subject)
          else 'Mathematics'
        end as normalized_subject
      from public.classes c
      where c.learner_id is null and c.band is not null
    ),
    winners as (
      select grade, band, normalized_subject, min(id::text)::uuid as keep_id
      from group_rows
      group by grade, band, normalized_subject
    ),
    losers as (
      select g.id as lose_id, w.keep_id
      from group_rows g
      join winners w on w.grade = g.grade and w.band = g.band and w.normalized_subject = g.normalized_subject
      where g.id <> w.keep_id
    )
    delete from public.class_enrollments ce
    using losers l
    where ce.class_id = l.lose_id;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'class_sessions'
  ) then
    with group_rows as (
      select
        c.id,
        c.grade,
        c.band,
        case
          when normalize_subject_label(c.subject) = any (allowed) then normalize_subject_label(c.subject)
          else 'Mathematics'
        end as normalized_subject
      from public.classes c
      where c.learner_id is null and c.band is not null
    ),
    winners as (
      select grade, band, normalized_subject, min(id::text)::uuid as keep_id
      from group_rows
      group by grade, band, normalized_subject
    ),
    losers as (
      select g.id as lose_id, w.keep_id
      from group_rows g
      join winners w on w.grade = g.grade and w.band = g.band and w.normalized_subject = g.normalized_subject
      where g.id <> w.keep_id
    )
    update public.class_sessions cs
    set class_id = l.keep_id
    from losers l
    where cs.class_id = l.lose_id;
  end if;

  with group_rows as (
    select
      c.id,
      c.grade,
      c.band,
      case
        when normalize_subject_label(c.subject) = any (allowed) then normalize_subject_label(c.subject)
        else 'Mathematics'
      end as normalized_subject
    from public.classes c
    where c.learner_id is null and c.band is not null
  ),
  winners as (
    select grade, band, normalized_subject, min(id::text)::uuid as keep_id
    from group_rows
    group by grade, band, normalized_subject
  ),
  losers as (
    select g.id as lose_id, w.keep_id
    from group_rows g
    join winners w on w.grade = g.grade and w.band = g.band and w.normalized_subject = g.normalized_subject
    where g.id <> w.keep_id
  )
  delete from public.classes c
  using losers l
  where c.id = l.lose_id;

  -- classes.subject
  update classes
  set subject = normalize_subject_label(subject);

  update classes
  set subject = 'Mathematics'
  where subject is null
     or trim(subject) = ''
     or not (subject = any (allowed));
end $$;

-- Enforce new allowed list at the DB boundary (enrollment leads, application submission).
create or replace function validate_application_payload(
  p_province text,
  p_subjects text[],
  p_package_id text,
  p_grade smallint
)
returns void
language plpgsql
as $$
declare
  allowed_provinces text[] := array[
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
  ];
  allowed_subjects text[] := array[
    'Agricultural Sciences',
    'Civil Technology',
    'Coding & Robotics',
    'Electrical Technology',
    'Engineering Graphic Design',
    'English (H.L & F.A.L)',
    'Life Sciences',
    'Mathematics',
    'Mechanical Technology',
    'Natural Sciences',
    'Physical Sciences',
    'Technical Mathematics',
    'Technical Science',
    'Technology'
  ];
  s text;
  normalized text;
begin
  if p_province is null or not (p_province = any (allowed_provinces)) then
    raise exception 'invalid_province' using errcode = '22023';
  end if;

  if p_package_id is null or p_package_id not in ('package-a', 'package-b') then
    raise exception 'invalid_package' using errcode = '22023';
  end if;

  if p_grade is null or p_grade < 6 or p_grade > 12 then
    raise exception 'invalid_grade' using errcode = '22023';
  end if;

  if p_subjects is null or cardinality(p_subjects) < 1 then
    raise exception 'subjects_required' using errcode = '22023';
  end if;

  if cardinality(p_subjects) > 4 then
    raise exception 'too_many_subjects' using errcode = '22023';
  end if;

  foreach s in array p_subjects loop
    normalized := normalize_subject_label(s);
    if not (normalized = any (allowed_subjects)) then
      raise exception 'invalid_subject: %', s using errcode = '22023';
    end if;
  end loop;
end;
$$;

