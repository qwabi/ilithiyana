-- Backfill group class caps to 8 (legacy rows may still be 3)

do $$
declare
  v_updated int;
begin
  update public.classes
  set max_enrollment = 8
  where learner_id is null
    and (max_enrollment is null or max_enrollment < 8);

  get diagnostics v_updated = row_count;
  raise notice 'Backfilled max_enrollment to 8 for % group class row(s).', v_updated;
end;
$$;
