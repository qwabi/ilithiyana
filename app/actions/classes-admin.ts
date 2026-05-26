'use server';

import { revalidatePath } from 'next/cache';
import { regenerateSessionsForLearnerEnrollments } from '@/lib/class-schedules';
import {
  enrollLearnerInGroupClass,
  getGroupClassById,
  listGroupClassesForAdmin,
  listLearnersForAdmin,
  listTutorsForAdmin,
  unenrollLearnerFromGroupClass,
  updateGroupClass,
  type GroupClassUpdateInput,
} from '@/lib/supabase/admin';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { GroupClassWithCount } from '@/lib/types/database';

export async function fetchGroupClasses(): Promise<{
  data: GroupClassWithCount[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listGroupClassesForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load classes',
    };
  }
}

export async function fetchGroupClassById(id: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const data = await getGroupClassById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load class',
    };
  }
}

export async function fetchClassAdminOptions() {
  if (!isSupabaseConfigured()) {
    return { learners: [], tutors: [], error: 'Supabase is not configured.' };
  }
  try {
    const [learners, tutors] = await Promise.all([
      listLearnersForAdmin(),
      listTutorsForAdmin(),
    ]);
    return { learners, tutors };
  } catch (e) {
    return {
      learners: [],
      tutors: [],
      error: e instanceof Error ? e.message : 'Failed to load options',
    };
  }
}

export async function updateGroupClassSettings(
  id: string,
  input: GroupClassUpdateInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  if (input.max_enrollment < 1 || input.max_enrollment > 8) {
    return { ok: false, error: 'Max enrollment must be between 1 and 8.' };
  }
  try {
    await updateGroupClass(id, input);
    revalidatePath('/admin/dashboard/classes');
    revalidatePath(`/admin/dashboard/classes/${id}`);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/tutor/schedule');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not update class',
    };
  }
}

export async function enrollLearnerInClass(
  classId: string,
  learnerId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  try {
    const supabase = createServiceClient();
    await enrollLearnerInGroupClass(classId, learnerId);
    await regenerateSessionsForLearnerEnrollments(
      supabase,
      learnerId,
      'admin:enroll'
    );
    revalidatePath('/admin/dashboard/classes');
    revalidatePath(`/admin/dashboard/classes/${classId}`);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/tutor/schedule');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not enroll learner',
    };
  }
}

export async function unenrollLearnerFromClass(
  enrollmentId: string,
  learnerId: string,
  classId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  try {
    const supabase = createServiceClient();
    await unenrollLearnerFromGroupClass(enrollmentId);
    await regenerateSessionsForLearnerEnrollments(
      supabase,
      learnerId,
      'admin:unenroll'
    );
    revalidatePath('/admin/dashboard/classes');
    revalidatePath(`/admin/dashboard/classes/${classId}`);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/tutor/schedule');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not remove learner',
    };
  }
}
