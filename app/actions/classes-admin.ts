'use server';

import { revalidatePath } from 'next/cache';
import {
  deleteClass,
  listClasses,
  listLearnersForAdmin,
  listTutorsForAdmin,
  upsertClass,
  type ClassInput,
} from '@/lib/supabase/admin';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { ClassRow } from '@/lib/types/database';

export async function listClassesForAdmin(learnerId?: string) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  try {
    const data = await listClasses(learnerId);
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load classes',
    };
  }
}

export async function listClassCatalogTutors() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  try {
    const data = await listTutorsForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load tutors',
    };
  }
}

export async function listClassCatalogLearners() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  try {
    const data = await listLearnersForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load learners',
    };
  }
}

export async function saveClass(
  id: string | null,
  input: ClassInput
): Promise<{ data: ClassRow | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const data = await upsertClass(id, input);
    revalidatePath('/admin/dashboard/classes');
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Could not save class',
    };
  }
}

export async function removeClass(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  try {
    await deleteClass(id);
    revalidatePath('/admin/dashboard/classes');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not delete class',
    };
  }
}

export async function listClassEnrollments(classId: string) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('class_enrollments')
    .select(
      `
      id,
      learner_id,
      status,
      enrolled_at,
      learners ( id, first_name, last_name, grade, school_name )
    `
    )
    .eq('class_id', classId)
    .order('enrolled_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}
