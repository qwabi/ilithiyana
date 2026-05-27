-- Canonical tutor email: masande@ilithiyana.com (idempotent)

do $$
declare
  v_user_id uuid;
  v_tutor_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'masande@ilithiyana.com'
  limit 1;

  if v_user_id is null then
    select id into v_user_id
    from auth.users
    where email = 'masande@ilithiyana.co.za'
    limit 1;
  end if;

  update public.tutors
  set
    email = 'masande@ilithiyana.com',
    first_name = 'Masande',
    last_name = 'Dudula',
    profile_id = coalesce(v_user_id, profile_id)
  where email in ('masande@ilithiyana.co.za', 'masande@ilithiyana.com');

  if not found and v_user_id is not null then
    insert into public.profiles (id, role, full_name, email)
    values (v_user_id, 'admin', 'Masande Dudula', 'masande@ilithiyana.com')
    on conflict (id) do update
      set role = 'admin',
          full_name = 'Masande Dudula',
          email = 'masande@ilithiyana.com';

    insert into public.tutors (profile_id, first_name, last_name, email, subjects, session_rate_cents)
    values (
      v_user_id,
      'Masande',
      'Dudula',
      'masande@ilithiyana.com',
      array['Pure Maths', 'Physical Science', 'Life Sciences', 'English', 'Natural Sciences'],
      20000
    )
    on conflict (email) do update
      set profile_id = excluded.profile_id,
          subjects = excluded.subjects,
          session_rate_cents = excluded.session_rate_cents;
  elsif not found then
    raise notice 'No tutor row to update; create Masande in Supabase Auth (masande@ilithiyana.com) and re-run.';
  end if;

  select id into v_tutor_id from public.tutors where email = 'masande@ilithiyana.com';
  raise notice 'Default tutor (masande@ilithiyana.com): %', v_tutor_id;
end;
$$;
