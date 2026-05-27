-- Tutor signup uploads use auth user id as the storage folder (before tutors row exists).
-- Existing policies only allowed tutors.id as folder name via tutor_id_for_auth().

drop policy if exists tutor_documents_tutor_own on storage.objects;
drop policy if exists tutor_documents_tutor_insert on storage.objects;
drop policy if exists tutor_documents_tutor_select on storage.objects;
drop policy if exists tutor_documents_tutor_update on storage.objects;
drop policy if exists tutor_documents_tutor_delete on storage.objects;

create policy tutor_documents_tutor_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'tutor-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.tutor_id_for_auth()::text
    )
  );

create policy tutor_documents_tutor_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'tutor-documents'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.tutor_id_for_auth()::text
    )
  );

create policy tutor_documents_tutor_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'tutor-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.tutor_id_for_auth()::text
    )
  )
  with check (
    bucket_id = 'tutor-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.tutor_id_for_auth()::text
    )
  );

create policy tutor_documents_tutor_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'tutor-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.tutor_id_for_auth()::text
    )
  );
