'use server';

import { revalidatePath } from 'next/cache';
import {
  createTutorDocumentSignedDownloadUrl,
  tutorDocumentStoragePath,
} from '@/lib/supabase/tutor-documents';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  sendTutorApplicationReceivedEmail,
  sendTutorVettingEmail,
} from '@/lib/email';
import type {
  TutorAdminFilters,
  TutorDocumentRow,
  TutorDocumentType,
  TutorProfileRow,
  TutorProfileWithTutor,
  TutorVettingStatus,
} from '@/lib/types/tutor-admin';

export async function listTutorProfiles(
  filters: TutorAdminFilters = {}
): Promise<{ data: TutorProfileWithTutor[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('tutor_profiles')
    .select(
      `
      *,
      tutors ( id, first_name, last_name, email, subjects, session_rate_cents, profile_id )
    `
    )
    .order('applied_at', { ascending: false });

  if (filters.vettingStatus) {
    query = query.eq('vetting_status', filters.vettingStatus);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TutorProfileWithTutor[] };
}

export async function getTutorProfile(
  tutorId: string
): Promise<{ data: TutorProfileWithTutor | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_profiles')
    .select(
      `
      *,
      tutors ( id, first_name, last_name, email, subjects, session_rate_cents, profile_id )
    `
    )
    .eq('tutor_id', tutorId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as TutorProfileWithTutor | null };
}

export async function updateTutorVettingStatus(
  tutorId: string,
  status: TutorVettingStatus,
  opts?: { rejectionReason?: string; reviewedBy?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data: tutor, error: tutorError } = await supabase
    .from('tutors')
    .select('id, first_name, last_name, email')
    .eq('id', tutorId)
    .maybeSingle();

  if (tutorError || !tutor) {
    return { ok: false, error: tutorError?.message ?? 'Tutor not found' };
  }

  const patch: Partial<TutorProfileRow> & {
    vetted_at?: string | null;
    vetted_by?: string | null;
    rejection_reason?: string | null;
  } = {
    vetting_status: status,
    rejection_reason:
      status === 'rejected' ? opts?.rejectionReason ?? null : null,
    vetted_at:
      status === 'approved' || status === 'rejected'
        ? new Date().toISOString()
        : null,
    vetted_by: opts?.reviewedBy ?? null,
  };

  const { error } = await supabase
    .from('tutor_profiles')
    .update(patch)
    .eq('tutor_id', tutorId);

  if (error) return { ok: false, error: error.message };

  const tutorName = `${tutor.first_name} ${tutor.last_name}`;

  if (status === 'approved' || status === 'rejected') {
    await sendTutorVettingEmail({
      to: tutor.email,
      tutorName,
      status: status === 'approved' ? 'approved' : 'rejected',
      reason: opts?.rejectionReason,
    });
  }

  revalidatePath('/admin/dashboard');
  return { ok: true };
}

export async function registerTutorApplication(input: {
  firstName: string;
  lastName: string;
  email: string;
  subjects: string[];
  phone?: string;
  province?: string;
  bio?: string;
  qualifications?: string;
}): Promise<{ ok: true; tutorId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from('tutors')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing?.id) {
    return { ok: false, error: 'A tutor profile already exists for this email.' };
  }

  const { data: tutor, error: tutorError } = await supabase
    .from('tutors')
    .insert({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email,
      subjects: input.subjects,
      session_rate_cents: 0,
    })
    .select('id, first_name, last_name, email')
    .single();

  if (tutorError || !tutor) {
    return {
      ok: false,
      error: tutorError?.message ?? 'Could not create tutor record',
    };
  }

  const { error: profileError } = await supabase.from('tutor_profiles').insert({
    tutor_id: tutor.id,
    vetting_status: 'pending',
    phone: input.phone ?? null,
    province: input.province ?? null,
    bio: input.bio ?? null,
    qualifications: input.qualifications ?? null,
  });

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  await sendTutorApplicationReceivedEmail({
    to: tutor.email,
    tutorName: `${tutor.first_name} ${tutor.last_name}`,
  });

  return { ok: true, tutorId: tutor.id };
}

export async function listTutorDocuments(
  tutorId: string
): Promise<{ data: TutorDocumentRow[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_documents')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('uploaded_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TutorDocumentRow[] };
}

export async function recordTutorDocument(input: {
  tutorId: string;
  documentType: TutorDocumentType;
  fileName: string;
  mimeType?: string;
}): Promise<
  | { ok: true; documentId: string; storagePath: string }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const storagePath = tutorDocumentStoragePath(input.tutorId, input.fileName);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('tutor_documents')
    .insert({
      tutor_id: input.tutorId,
      document_type: input.documentType,
      storage_path: storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not record document' };
  }

  await supabase
    .from('tutor_profiles')
    .update({ vetting_status: 'documents_submitted' })
    .eq('tutor_id', input.tutorId)
    .in('vetting_status', ['pending']);

  return { ok: true, documentId: data.id, storagePath };
}

export async function getTutorDocumentDownloadUrl(
  documentId: string
): Promise<{ url: string | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle();

  if (error || !data?.storage_path) {
    return { url: null, error: error?.message ?? 'Document not found' };
  }

  try {
    const url = await createTutorDocumentSignedDownloadUrl(data.storage_path);
    return { url };
  } catch (e) {
    return {
      url: null,
      error: e instanceof Error ? e.message : 'Could not sign URL',
    };
  }
}
