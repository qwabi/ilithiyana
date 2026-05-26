-- Repair: admin_profiles PK is profile_id (20260529150000), not id.
-- Safe to re-run after a partial apply of 20260530120000.

drop policy if exists admin_profiles_self_select on admin_profiles;
drop policy if exists admin_profiles_select_own on admin_profiles;

create policy admin_profiles_self_select on admin_profiles
  for select to authenticated
  using (profile_id = auth.uid());
