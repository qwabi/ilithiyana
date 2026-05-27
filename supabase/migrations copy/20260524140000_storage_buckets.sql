-- Supabase Storage for Ilithiyana Academics (application documents)
-- Buckets are created via storage.buckets (no manual dashboard step required when migration runs).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'application-documents',
  'application-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Durable storage path on leads and applications (report_url kept for legacy blob URLs)
alter table enrollment_leads
  add column if not exists report_storage_path text;

alter table applications
  add column if not exists report_storage_path text;

-- Server-side uploads use service_role (bypasses RLS). Policies document intent and block anon/public access.
drop policy if exists application_documents_service_all on storage.objects;
drop policy if exists application_documents_admin_select on storage.objects;

create policy application_documents_service_all on storage.objects
  for all
  to service_role
  using (bucket_id = 'application-documents')
  with check (bucket_id = 'application-documents');

-- Authenticated admins may read objects when using Supabase Auth JWT (optional; admin UI uses service role)
create policy application_documents_admin_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'application-documents'
    and public.is_admin()
  );

-- Copy storage path when promoting paid lead to application
create or replace function convert_paid_enrollment_lead(
  p_lead_id uuid,
  p_payfast_payment_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead enrollment_leads%rowtype;
  v_parent_id uuid;
  v_learner_id uuid;
  v_app_id uuid;
  v_sub_id uuid;
  v_parent_json jsonb;
  v_learner_json jsonb;
begin
  select * into v_lead
  from enrollment_leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;

  if v_lead.status = 'paid' and v_lead.converted_application_id is not null then
    return v_lead.converted_application_id;
  end if;

  if v_lead.status <> 'awaiting_payment' then
    raise exception 'lead_not_awaiting_payment' using errcode = '22023';
  end if;

  perform validate_application_payload(
    v_lead.province,
    v_lead.subjects,
    v_lead.package_id,
    v_lead.learner_grade
  );

  v_parent_json := jsonb_build_object(
    'firstName', v_lead.parent_first_name,
    'lastName', v_lead.parent_last_name,
    'email', v_lead.parent_email,
    'phone', v_lead.parent_phone,
    'address', coalesce(v_lead.parent_address, '')
  );

  v_learner_json := jsonb_build_object(
    'firstName', v_lead.learner_first_name,
    'lastName', v_lead.learner_last_name,
    'dateOfBirth', v_lead.learner_date_of_birth::text,
    'schoolName', v_lead.learner_school_name,
    'grade', v_lead.learner_grade::text
  );

  insert into parents (
    first_name,
    last_name,
    email,
    phone,
    address,
    province
  )
  values (
    v_lead.parent_first_name,
    v_lead.parent_last_name,
    v_lead.parent_email,
    v_lead.parent_phone,
    v_lead.parent_address,
    v_lead.province
  )
  returning id into v_parent_id;

  insert into learners (
    parent_id,
    first_name,
    last_name,
    date_of_birth,
    school_name,
    grade
  )
  values (
    v_parent_id,
    v_lead.learner_first_name,
    v_lead.learner_last_name,
    v_lead.learner_date_of_birth,
    v_lead.learner_school_name,
    v_lead.learner_grade
  )
  returning id into v_learner_id;

  insert into applications (
    parent_id,
    learner_id,
    status,
    province,
    subjects,
    package_id,
    schedule,
    report_url,
    report_storage_path,
    payment_proof_url,
    parent_snapshot,
    learner_snapshot
  )
  values (
    v_parent_id,
    v_learner_id,
    'approved',
    v_lead.province,
    v_lead.subjects,
    v_lead.package_id,
    coalesce(v_lead.schedule, '{}'::jsonb),
    v_lead.report_url,
    v_lead.report_storage_path,
    null,
    v_parent_json,
    v_learner_json
  )
  returning id into v_app_id;

  insert into subscriptions (
    learner_id,
    package_id,
    status,
    amount_cents,
    period_start,
    period_end
  )
  values (
    v_learner_id,
    v_lead.package_id,
    'paid',
    v_lead.amount_cents,
    current_date,
    (current_date + interval '1 month')::date
  )
  returning id into v_sub_id;

  insert into payments (
    subscription_id,
    application_id,
    gateway_ref,
    amount_cents,
    status,
    paid_at
  )
  values (
    v_sub_id,
    v_app_id,
    nullif(trim(p_payfast_payment_id), ''),
    v_lead.amount_cents,
    'complete',
    now()
  );

  update enrollment_leads
  set
    status = 'paid',
    payfast_payment_id = coalesce(nullif(trim(p_payfast_payment_id), ''), payfast_payment_id),
    converted_parent_id = v_parent_id,
    converted_application_id = v_app_id,
    paid_at = now()
  where id = p_lead_id;

  return v_app_id;
end;
$$;
