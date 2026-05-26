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

export type TutorClassWithCount = ClassRow & { enrollment_count: number };

export async function getTutorClasses(
  tutorId: string
): Promise<TutorClassWithCount[]> {
  const supabase = createServiceClient();
  const { data: classes, error } = await supabase
    .from('classes')
    .select(
      `
      id, subject, grade, band, band_label,
      schedule_day, schedule_time, meet_link,
      max_enrollment, is_active, schedule, level, learner_id, tutor_id, created_at
    `
    )
    .eq('tutor_id', tutorId)
    .eq('is_active', true)
    .is('learner_id', null)
    .order('schedule_day')
    .order('schedule_time')
    .order('subject');

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  const ids = (classes ?? []).map((c) => c.id as string);
  if (!ids.length) return [];

  const { data: counts } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('status', 'active')
    .in('class_id', ids);

  const countMap = (counts ?? []).reduce(
    (m, r) => {
      const cid = r.class_id as string;
      m[cid] = (m[cid] ?? 0) + 1;
      return m;
    },
    {} as Record<string, number>
  );

  return (classes ?? []).map((cls) => ({
    ...(cls as ClassRow),
    enrollment_count: countMap[cls.id as string] ?? 0,
  }));
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
