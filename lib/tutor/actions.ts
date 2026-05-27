'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { sendTutorApplicationReceivedEmail } from '@/lib/tutor/email';
import { sendTutorVettingEmail, sendTimesheetStatusEmail } from '@/lib/email';
import { updateTimesheetStatus } from '@/lib/supabase/admin';
import { updateTutorVetting, listTutorDocuments } from '@/lib/tutor-auth';
import { getTutorSession } from '@/lib/tutor/queries';
import { provisionTutorAuthUser } from '@/lib/tutor-auth';
import { TUTOR_DOCUMENTS_BUCKET } from '@/lib/tutor/constants';
import type { TutorDocumentType, TutorVettingStatus, TimesheetStatus } from '@/lib/types/database';

function tutorSignupStoragePath(
  userId: string,
  documentType: TutorDocumentType,
  fileName: string
): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'bin';
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${documentType}-${Date.now()}-${safe}.${ext}`;
}

/**
 * Service-role upload during signup (no session cookie required).
 * Verifies userId + email against auth.users via admin API.
 */
export async function uploadTutorSignupDocument(input: {
  userId: string;
  email: string;
  documentType: TutorDocumentType;
  formData: FormData;
}): Promise<
  | { ok: true; storagePath: string; fileName: string }
  | { ok: false; error: string }
> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const supabase = createServiceClient();

  const { data: authUser, error: userError } =
    await supabase.auth.admin.getUserById(input.userId);

  if (userError || !authUser.user) {
    return { ok: false, error: 'Account not found. Please try signing up again.' };
  }

  if (authUser.user.email?.toLowerCase() !== normalizedEmail) {
    return { ok: false, error: 'Upload could not be verified for this account.' };
  }

  const file = input.formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No file provided' };
  }

  const storagePath = tutorSignupStoragePath(
    input.userId,
    input.documentType,
    file.name
  );

  const { error } = await supabase.storage
    .from(TUTOR_DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, storagePath, fileName: file.name };
}

export async function registerTutorAuth(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  try {
    const { userId } = await provisionTutorAuthUser({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    return { ok: true, userId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not create account',
    };
  }
}

export async function finalizeTutorSignup(input: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  subjects: string[];
  documents: {
    documentType: TutorDocumentType;
    storagePath: string;
    fileName: string;
  }[];
}): Promise<{ ok: true; tutorId: string } | { ok: false; error: string }> {
  try {
    const supabase = createServiceClient();
    const email = input.email.trim().toLowerCase();
    const fullName = `${input.firstName} ${input.lastName}`.trim();

    await supabase.from('profiles').upsert({
      id: input.userId,
      role: 'tutor',
      full_name: fullName,
      email,
      phone: input.phone,
      province: input.province,
    });

    const { data: existing } = await supabase
      .from('tutors')
      .select('id')
      .eq('profile_id', input.userId)
      .maybeSingle();

    let tutorId = existing?.id as string | undefined;

    if (!tutorId) {
      const { data: tutor, error: tutorError } = await supabase
        .from('tutors')
        .insert({
          profile_id: input.userId,
          first_name: input.firstName,
          last_name: input.lastName,
          email,
          subjects: input.subjects,
          session_rate_cents: 17500,
        })
        .select('id')
        .single();

      if (tutorError || !tutor) {
        return {
          ok: false,
          error: tutorError?.message ?? 'Could not create tutor record',
        };
      }
      tutorId = tutor.id;
    }

    const { error: profileError } = await supabase.from('tutor_profiles').upsert(
      {
        tutor_id: tutorId,
        phone: input.phone,
        province: input.province,
        vetting_status: 'pending',
        onboarding_complete: false,
      },
      { onConflict: 'tutor_id' }
    );

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    if (input.documents.length > 0) {
      const { error: docError } = await supabase.from('tutor_documents').insert(
        input.documents.map((d) => ({
          tutor_id: tutorId,
          document_type: d.documentType,
          storage_path: d.storagePath,
          file_name: d.fileName,
        }))
      );
      if (docError) {
        return { ok: false, error: docError.message };
      }
    }

    await sendTutorApplicationReceivedEmail({
      to: email,
      tutorName: input.firstName,
    });

    revalidatePath('/tutor');
    return { ok: true, tutorId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Registration failed',
    };
  }
}

export async function saveTutorOnboardingProfile(input: {
  phone: string;
  province: string;
  idNumber: string;
  bio: string;
  gradesTaught: number[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getTutorSession();
  if (!session) {
    return { ok: false, error: 'Please sign in again.' };
  }

  if (session.profile.vetting_status !== 'approved') {
    return {
      ok: false,
      error: 'Your application must be approved before completing onboarding.',
    };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('tutor_profiles')
    .update({
      phone: input.phone,
      province: input.province,
      id_number: input.idNumber || null,
      bio: input.bio || null,
      grades_taught: input.gradesTaught,
      onboarding_complete: true,
    })
    .eq('tutor_id', session.tutor.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase
    .from('tutors')
    .update({
      subjects: session.tutor.subjects,
    })
    .eq('id', session.tutor.id);

  revalidatePath('/tutor');
  return { ok: true };
}

export async function submitTutorTimesheetAction(input: {
  monthPeriod: string;
  sessionsCount: number;
  notes?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await getTutorSession();
  if (!session) {
    return { ok: false, error: 'Please sign in again.' };
  }

  if (session.profile.vetting_status !== 'approved') {
    return { ok: false, error: 'Your tutor account is not yet approved.' };
  }

  if (!input.monthPeriod || input.sessionsCount < 1) {
    return { ok: false, error: 'Enter a valid month and session count.' };
  }

  const supabase = createServiceClient();
  const amountCents = session.tutor.session_rate_cents * input.sessionsCount;

  const { data, error } = await supabase
    .from('tutor_timesheets')
    .upsert(
      {
        tutor_id: session.tutor.id,
        month_period: input.monthPeriod,
        sessions_count: input.sessionsCount,
        amount_cents: amountCents,
        status: 'submitted',
        notes: input.notes ?? null,
      },
      { onConflict: 'tutor_id,month_period' }
    )
    .select('id')
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? 'Could not submit timesheet',
    };
  }

  revalidatePath('/tutor/timesheets');
  return { ok: true, id: data.id as string };
}

export async function updateTutorProfileAction(input: {
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  subjects: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getTutorSession();
  if (!session) {
    return { ok: false, error: 'Please sign in again.' };
  }

  const supabase = createServiceClient();
  const fullName = `${input.firstName} ${input.lastName}`.trim();

  const { error: tutorError } = await supabase
    .from('tutors')
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      subjects: input.subjects,
    })
    .eq('id', session.tutor.id);

  if (tutorError) {
    return { ok: false, error: tutorError.message };
  }

  const { error: profileError } = await supabase
    .from('tutor_profiles')
    .update({
      phone: input.phone,
      province: input.province,
    })
    .eq('tutor_id', session.tutor.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  await supabase.from('profiles').upsert({
    id: session.userId,
    role: 'tutor',
    full_name: fullName,
    email: session.email,
    phone: input.phone,
    province: input.province,
  });

  revalidatePath('/tutor/profile');
  return { ok: true };
}

export async function tutorSignOut() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/tutor', 'layout');
  redirect('/tutor/login');
}

export async function setTutorVettingStatus(
  tutorId: string,
  status: Extract<TutorVettingStatus, 'approved' | 'rejected'>,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();
    const { data: tutor } = await supabase
      .from('tutors')
      .select('first_name, last_name, email')
      .eq('id', tutorId)
      .maybeSingle();

    if (!tutor) {
      return { ok: false, error: 'Tutor not found' };
    }

    await updateTutorVetting(tutorId, status, { notes });

    await sendTutorVettingEmail({
      to: tutor.email,
      tutorName: `${tutor.first_name} ${tutor.last_name}`.trim(),
      status,
      reason: notes,
    });

    revalidatePath('/admin/dashboard/tutors');
    return { ok: true };
  } catch (e) {
    const message =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message: unknown }).message)
        : e instanceof Error
          ? e.message
          : 'Update failed';
    return { ok: false, error: message };
  }
}

export async function listPendingTutorsForAdmin() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_profiles')
    .select(
      `*, tutors (id, first_name, last_name, email, subjects, session_rate_cents, created_at)`
    )
    .eq('vetting_status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}

export type AdminTutorListRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subjects: string[];
  created_at: string;
  vetting_status: string;
  province: string | null;
  applied_at: string | null;
  onboarding_complete: boolean;
  vetted_at: string | null;
};

export type IncompleteTutorProspectRow = {
  profile_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  province: string | null;
  created_at: string;
};

function unwrapTutorProfile(
  raw: unknown
): {
  vetting_status: string;
  province: string | null;
  applied_at: string | null;
  onboarding_complete: boolean;
  vetted_at: string | null;
} | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== 'object') return null;
  const p = row as Record<string, unknown>;
  return {
    vetting_status: String(p.vetting_status ?? 'pending'),
    province: (p.province as string) ?? null,
    applied_at: (p.applied_at as string) ?? null,
    onboarding_complete: Boolean(p.onboarding_complete),
    vetted_at: (p.vetted_at as string) ?? null,
  };
}

/** All registered tutors with vetting profile (any status). */
export async function listAllTutorsForAdmin(): Promise<{
  data: AdminTutorListRow[];
  error?: string;
}> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutors')
    .select(
      `
      id, first_name, last_name, email, subjects, created_at,
      tutor_profiles (
        vetting_status, province, applied_at, onboarding_complete, vetted_at
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const rows: AdminTutorListRow[] = (data ?? []).map((row) => {
    const profile = unwrapTutorProfile(row.tutor_profiles);
    return {
      id: row.id as string,
      first_name: row.first_name as string,
      last_name: row.last_name as string,
      email: row.email as string,
      subjects: (row.subjects as string[]) ?? [],
      created_at: row.created_at as string,
      vetting_status: profile?.vetting_status ?? 'pending',
      province: profile?.province ?? null,
      applied_at: profile?.applied_at ?? null,
      onboarding_complete: profile?.onboarding_complete ?? false,
      vetted_at: profile?.vetted_at ?? null,
    };
  });

  return { data: rows };
}

/** Auth profiles with role tutor but no tutors row yet (signup incomplete). */
export async function listIncompleteTutorProspects(): Promise<{
  data: IncompleteTutorProspectRow[];
  error?: string;
}> {
  const supabase = createServiceClient();

  const [{ data: profiles, error: profileError }, { data: tutors, error: tutorError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, phone, province, created_at')
        .eq('role', 'tutor')
        .order('created_at', { ascending: false }),
      supabase.from('tutors').select('profile_id'),
    ]);

  if (profileError) return { data: [], error: profileError.message };
  if (tutorError) return { data: [], error: tutorError.message };

  const registered = new Set(
    (tutors ?? [])
      .map((t) => t.profile_id as string | null)
      .filter((id): id is string => Boolean(id))
  );

  const data = (profiles ?? [])
    .filter((p) => !registered.has(p.id as string))
    .map((p) => ({
      profile_id: p.id as string,
      email: (p.email as string) ?? null,
      full_name: (p.full_name as string) ?? null,
      phone: (p.phone as string) ?? null,
      province: (p.province as string) ?? null,
      created_at: p.created_at as string,
    }));

  return { data };
}

export async function fetchTutorDocumentsForAdmin(tutorId: string) {
  try {
    const docs = await listTutorDocuments(tutorId);
    const supabase = createServiceClient();
    const signed = await Promise.all(
      docs.map(async (doc) => {
        const { data } = await supabase.storage
          .from('tutor-documents')
          .createSignedUrl(doc.storage_path, 3600);
        return { ...doc, signedUrl: data?.signedUrl ?? null };
      })
    );
    return { data: signed };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load documents',
    };
  }
}

export async function adminSetTimesheetStatus(
  id: string,
  status: Extract<TimesheetStatus, 'approved' | 'rejected'>,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();
    const { data: sheet } = await supabase
      .from('tutor_timesheets')
      .select('*, tutors(first_name, last_name, email)')
      .eq('id', id)
      .maybeSingle();

    await updateTimesheetStatus(id, status, notes);

    const tutor = sheet?.tutors as {
      first_name: string;
      last_name: string;
      email: string;
    } | null;

    if (tutor?.email && sheet) {
      await sendTimesheetStatusEmail({
        to: tutor.email,
        tutorName: `${tutor.first_name} ${tutor.last_name}`.trim(),
        monthPeriod: sheet.month_period,
        status,
        amountCents: sheet.amount_cents,
        notes,
      });
    }

    revalidatePath('/admin/dashboard/timesheets');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Update failed',
    };
  }
}
