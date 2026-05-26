import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';
import {
  getTutorSession,
  normalizeTutorProfile,
  type TutorWithProfile,
} from '@/lib/tutor-auth';
import type {
  ClassRow,
  TutorDocumentRow,
  TutorTimesheetRow,
} from '@/lib/types/database';

export { getTutorSession, normalizeTutorProfile };
export type { TutorWithProfile };

export async function getTutorClasses(tutorId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('classes')
    .select('*, learners (id, first_name, last_name, grade, school_name)')
    .eq('tutor_id', tutorId)
    .eq('is_active', true)
    .order('subject', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [] as ClassRow[];
    throw error;
  }
  return (data ?? []) as ClassRow[];
}

export async function getTutorTimesheets(tutorId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_timesheets')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('month_period', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [] as TutorTimesheetRow[];
    throw error;
  }
  return (data ?? []) as TutorTimesheetRow[];
}

export async function getTutorTimesheetById(
  tutorId: string,
  timesheetId: string
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_timesheets')
    .select('*')
    .eq('id', timesheetId)
    .eq('tutor_id', tutorId)
    .maybeSingle();

  if (error) throw error;
  return data as TutorTimesheetRow | null;
}

export async function listTutorDocumentsForSession(
  tutorId: string
): Promise<TutorDocumentRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tutor_documents')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data ?? []) as TutorDocumentRow[];
}
