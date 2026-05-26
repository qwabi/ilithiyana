-- Learners/applications/enrollment_leads.subjects store curriculum subject ids
-- (lib/curriculum/subjects.ts), not display names.

comment on column learners.subjects is
  'Curriculum subject ids from lib/curriculum/subjects.ts';
comment on column applications.subjects is
  'Curriculum subject ids from lib/curriculum/subjects.ts';
comment on column enrollment_leads.subjects is
  'Curriculum subject ids from lib/curriculum/subjects.ts';

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
  allowed_legacy_subjects text[] := array[
    'Pure Maths', 'Pure Mathematics',
    'Physical Science', 'Physical Sciences',
    'Life Sciences', 'English',
    'Natural Sciences'
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
    -- Curriculum ids: lowercase slug (e.g. mathematics-fet, english-hl-fet)
    if s ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(s) >= 3 then
      continue;
    end if;

    normalized := s;
    if normalized = 'Pure Mathematics' then normalized := 'Pure Maths'; end if;
    if normalized = 'Physical Sciences' then normalized := 'Physical Science'; end if;
    if not (normalized = any (allowed_legacy_subjects)) then
      raise exception 'invalid_subject: %', s using errcode = '22023';
    end if;
  end loop;
end;
$$;
