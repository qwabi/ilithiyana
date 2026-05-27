-- Parent onboarding wizard sessions (service-role writes only)

do $$ begin
  create type onboarding_step as enum (
    'account',
    'children',
    'payment',
    'setup',
    'reports',
    'complete'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type onboarding_payment_status as enum ('pending', 'complete', 'failed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  parent_id uuid references parents(id) on delete set null,
  email text not null,
  parent_first_name text,
  parent_last_name text,
  parent_phone text,
  parent_address text,
  province text,
  preferred_contact preferred_contact_method default 'email',
  child_count integer check (child_count is null or (child_count >= 1 and child_count <= 6)),
  package_selections jsonb not null default '[]'::jsonb,
  total_amount_cents integer check (total_amount_cents is null or total_amount_cents >= 0),
  payment_status onboarding_payment_status not null default 'pending',
  payment_ref text,
  current_step onboarding_step not null default 'account',
  completed_steps text[] not null default '{}',
  learner_ids uuid[] not null default '{}',
  reports_added boolean not null default false,
  popia_consent boolean not null default false,
  popia_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_sessions_user_idx on onboarding_sessions (user_id);
create index if not exists onboarding_sessions_email_idx on onboarding_sessions (lower(email));
create index if not exists onboarding_sessions_payment_status_idx on onboarding_sessions (payment_status);
create index if not exists onboarding_sessions_current_step_idx on onboarding_sessions (current_step);

drop trigger if exists onboarding_sessions_updated_at on onboarding_sessions;
create trigger onboarding_sessions_updated_at
  before update on onboarding_sessions
  for each row execute function set_updated_at();

alter table onboarding_sessions enable row level security;

-- Authenticated parents may read/update their own session (no public insert)
create policy onboarding_sessions_select_own on onboarding_sessions
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy onboarding_sessions_update_own on onboarding_sessions
  for update to authenticated
  using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Confirm PayFast payment: link parent row, advance to setup (no learners)
create or replace function confirm_onboarding_payment(
  p_session_id uuid,
  p_payfast_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session onboarding_sessions%rowtype;
  v_parent_id uuid;
  v_existing_parent uuid;
  v_steps text[];
begin
  select * into v_session from onboarding_sessions where id = p_session_id for update;

  if not found then
    raise exception 'session_not_found' using errcode = 'P0002';
  end if;

  if v_session.payment_status = 'complete' then
    return jsonb_build_object(
      'session_id', v_session.id,
      'parent_id', v_session.parent_id,
      'current_step', v_session.current_step,
      'already_confirmed', true
    );
  end if;

  if v_session.payment_status <> 'pending' then
    raise exception 'payment_not_pending' using errcode = '22023';
  end if;

  select id into v_existing_parent from parents where lower(email) = lower(v_session.email);

  if v_existing_parent is not null then
    v_parent_id := v_existing_parent;
    update parents set
      phone = coalesce(v_session.parent_phone, phone),
      province = coalesce(v_session.province, province),
      preferred_contact = coalesce(v_session.preferred_contact, preferred_contact),
      first_name = coalesce(v_session.parent_first_name, first_name),
      last_name = coalesce(v_session.parent_last_name, last_name),
      address = coalesce(v_session.parent_address, address)
    where id = v_parent_id;

    if v_session.user_id is not null then
      update parents set profile_id = v_session.user_id
      where id = v_parent_id and (profile_id is null or profile_id = v_session.user_id);
    end if;
  else
    insert into parents (
      profile_id, first_name, last_name, email, phone, address, province, preferred_contact
    )
    values (
      v_session.user_id,
      coalesce(v_session.parent_first_name, 'Parent'),
      coalesce(v_session.parent_last_name, '—'),
      v_session.email,
      coalesce(v_session.parent_phone, ''),
      v_session.parent_address,
      coalesce(v_session.province, 'Gauteng'),
      coalesce(v_session.preferred_contact, 'email'::preferred_contact_method)
    )
    returning id into v_parent_id;
  end if;

  v_steps := v_session.completed_steps;
  if not ('payment' = any (v_steps)) then
    v_steps := array_append(v_steps, 'payment');
  end if;

  update onboarding_sessions set
    payment_status = 'complete',
    payment_ref = coalesce(nullif(trim(p_payfast_payment_id), ''), payment_ref, id::text),
    parent_id = v_parent_id,
    current_step = 'setup',
    completed_steps = v_steps
  where id = p_session_id;

  return jsonb_build_object(
    'session_id', p_session_id,
    'parent_id', v_parent_id,
    'current_step', 'setup',
    'already_confirmed', false
  );
end;
$$;

create or replace function attach_onboarding_learner(
  p_session_id uuid,
  p_learner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update onboarding_sessions
  set learner_ids = array_append(
    coalesce(learner_ids, '{}'::uuid[]),
    p_learner_id
  )
  where id = p_session_id
    and not (p_learner_id = any (coalesce(learner_ids, '{}'::uuid[])));
end;
$$;

revoke all on function confirm_onboarding_payment(uuid, text) from public;
grant execute on function confirm_onboarding_payment(uuid, text) to service_role;

revoke all on function attach_onboarding_learner(uuid, uuid) from public;
grant execute on function attach_onboarding_learner(uuid, uuid) to service_role;
