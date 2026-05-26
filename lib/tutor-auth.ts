import { createServiceClient } from '@/lib/supabase/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  TutorDocumentRow,
  TutorProfileRow,
  TutorRow,
  TutorVettingStatus,
} from '@/lib/types/database';

export type TutorWithProfile = TutorRow & {
  tutor_profiles: TutorProfileRow | TutorProfileRow[] | null;
};

export function normalizeTutorProfile(
  profile: TutorProfileRow | TutorProfileRow[] | null | undefined
): TutorProfileRow | null {
  if (!profile) return null;
  return Array.isArray(profile) ? profile[0] ?? null : profile;
}

export async function getTutorSession(): Promise<{
  userId: string;
  email: string;
  tutor: TutorWithProfile;
  profile: TutorProfileRow;
} | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: tutor, error } = await supabase
    .from('tutors')
    .select('*, tutor_profiles(*)')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (error || !tutor) return null;

  const profile = normalizeTutorProfile(
    (tutor as TutorWithProfile).tutor_profiles
  );
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email,
    tutor: tutor as TutorWithProfile,
    profile,
  };
}

export async function provisionTutorAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  province?: string;
  subjects: string[];
  sessionRateCents?: number;
}): Promise<{ userId: string; tutorId: string }> {
  const supabase = createServiceClient();
  const email = input.email.trim().toLowerCase();
  const fullName = `${input.firstName} ${input.lastName}`.trim();

  const { data: existingUsers } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existing = existingUsers.users.find(
    (u) => u.email?.toLowerCase() === email
  );
  if (existing) {
    throw new Error('An account with this email already exists. Try signing in.');
  }

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'tutor' },
    });
  if (createError || !created.user) {
    throw new Error(createError?.message ?? 'Could not create account');
  }

  const userId = created.user.id;

  await supabase.from('profiles').upsert({
    id: userId,
    role: 'tutor',
    full_name: fullName,
    email,
    phone: input.phone ?? null,
    province: input.province ?? null,
  });

  const { data: tutor, error: tutorError } = await supabase
    .from('tutors')
    .insert({
      profile_id: userId,
      first_name: input.firstName,
      last_name: input.lastName,
      email,
      subjects: input.subjects,
      session_rate_cents: input.sessionRateCents ?? 17500,
    })
    .select('id')
    .single();

  if (tutorError || !tutor) {
    throw new Error(tutorError?.message ?? 'Could not create tutor profile');
  }

  const { error: profileError } = await supabase.from('tutor_profiles').insert({
    tutor_id: tutor.id,
    phone: input.phone ?? null,
    province: input.province ?? null,
    vetting_status: 'pending',
    onboarding_complete: false,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  return { userId, tutorId: tutor.id };
}

export async function updateTutorVetting(
  tutorId: string,
  status: TutorVettingStatus,
  opts?: { notes?: string; reviewedBy?: string }
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_profiles')
    .update({
      vetting_status: status,
      vetting_notes: opts?.notes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: opts?.reviewedBy ?? null,
      onboarding_complete: status === 'approved',
    })
    .eq('tutor_id', tutorId)
    .select('*')
    .single();

  if (error) throw error;
  return data as TutorProfileRow;
}

export async function listTutorDocuments(
  tutorId: string
): Promise<TutorDocumentRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_documents')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TutorDocumentRow[];
}
