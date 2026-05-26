/*
 * Diagnostic snapshot (2026-05-28, remote ilithiyana Supabase via service role):
 * 1. classes: 0 rows (band column exists; no seeded group classes before fallback migration)
 * 2. tutors: default email masande@ilithiyana.com (canonical)
 * 3. learners→parents: 6 learners; benn@qwabi.co.za parent has profile_id; smoke test parent profile_id null
 * 4. subscriptions: 6 rows, all status active, parent_id populated
 * 5. payments: 6 rows, all complete, parent_id + learner_id set
 * 6. enrollment_leads: 11 rows; duplicate awaiting_payment Ayabonga leads (pre-upsert guard)
 * 7. class_sessions: 0 rows
 * 8. subscriptions.parent_id: uuid, nullable
 * 9. payments.parent_id + learner_id: uuid, nullable
 * 10. learner_reports: exists (manual + OCR migrations applied)
 * RPCs convert_paid_enrollment_lead / convert_add_child_lead: exist in 20260525000000_parent_portal.sql;
 *   they do NOT insert into classes — enrollments come from assignLearnerToClassGroups + SQL backfill.
 */
import type { createServiceClient } from '@/lib/supabase/server';
import { allocationLog } from '@/lib/allocation-log';
import type { ClassBand } from '@/lib/types/database';

type ServiceClient = ReturnType<typeof createServiceClient>;

const DEFAULT_TUTOR_EMAIL = 'masande@ilithiyana.com';
const LEGACY_TUTOR_EMAIL = 'masande@ilithiyana.co.za';

import {
  scheduleForTutoringSubject,
  isTutoringSubjectValidForGrade,
} from '@/lib/curriculum/subjects';

const BAND_LABELS: Record<ClassBand, string> = {
  A: 'Foundation (Level 1)',
  B: 'Developing (Levels 2-3)',
  C: 'Competent (Levels 4-5)',
  D: 'Advanced (Levels 6-7)',
};

export async function getDefaultTutorId(
  supabase: ServiceClient
): Promise<string | null> {
  const { data: primary } = await supabase
    .from('tutors')
    .select('id')
    .eq('email', DEFAULT_TUTOR_EMAIL)
    .maybeSingle();

  if (primary?.id) return primary.id;

  const { data: legacy } = await supabase
    .from('tutors')
    .select('id')
    .eq('email', LEGACY_TUTOR_EMAIL)
    .maybeSingle();

  return legacy?.id ?? null;
}

export function deriveBandFromLevel(level: string | null): ClassBand {
  if (!level) return 'B';
  const lower = level.toLowerCase();
  if (lower.includes('1')) return 'A';
  if (lower.includes('2') || lower.includes('3')) return 'B';
  if (lower.includes('4') || lower.includes('5')) return 'C';
  if (lower.includes('6') || lower.includes('7')) return 'D';
  return 'B';
}

/** Keep one active enrollment per learner + grade + subject (drops older class groups). */
async function cancelDuplicateSubjectEnrollments(
  supabase: ServiceClient,
  learnerId: string,
  grade: number,
  subject: string,
  keepClassId: string
): Promise<void> {
  const { data: rows, error } = await supabase
    .from('class_enrollments')
    .select('id, class_id, classes!inner ( subject, grade )')
    .eq('learner_id', learnerId)
    .eq('status', 'active');

  if (error || !rows?.length) return;

  const duplicateIds = rows
    .filter((row) => {
      const cls = row.classes as { subject: string; grade: number } | { subject: string; grade: number }[];
      const meta = Array.isArray(cls) ? cls[0] : cls;
      return (
        meta?.subject === subject &&
        meta?.grade === grade &&
        row.class_id !== keepClassId
      );
    })
    .map((row) => row.id as string);

  if (!duplicateIds.length) return;

  await supabase
    .from('class_enrollments')
    .update({ status: 'cancelled' })
    .in('id', duplicateIds);

  allocationLog('cancelDuplicateSubjectEnrollments', {
    learnerId,
    grade,
    subject,
    keepClassId,
    cancelled: duplicateIds.length,
  });
}

async function activeEnrollmentCount(
  supabase: ServiceClient,
  classId: string
): Promise<number> {
  const { count } = await supabase
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('status', 'active');
  return count ?? 0;
}

async function findGroupWithSpace(
  supabase: ServiceClient,
  grade: number,
  subject: string,
  band: ClassBand
): Promise<string | undefined> {
  const { data: groups } = await supabase
    .from('classes')
    .select('id, max_enrollment')
    .eq('grade', grade)
    .eq('subject', subject)
    .eq('band', band)
    .eq('is_active', true)
    .is('learner_id', null);

  for (const group of groups ?? []) {
    const enrolled = await activeEnrollmentCount(supabase, group.id as string);
    if (enrolled < ((group.max_enrollment as number) ?? 8)) {
      return group.id as string;
    }
  }
  return undefined;
}

/** Enrol one learner into a shared grade/subject/band class group. */
export async function enrollLearnerInSubjectBand(
  supabase: ServiceClient,
  learnerId: string,
  grade: number,
  subject: string,
  band: ClassBand,
  level: string | null
): Promise<void> {
  if (!isTutoringSubjectValidForGrade(grade, subject)) {
    allocationLog('enrollInSubjectBand:invalid_subject_for_grade', {
      learnerId,
      grade,
      subject,
    });
    return;
  }

  let classId = await findGroupWithSpace(supabase, grade, subject, band);

  if (!classId) {
    const fallbackBands: ClassBand[] =
      band === 'A'
        ? ['B', 'C', 'D']
        : band === 'B'
          ? ['A', 'C', 'D']
          : band === 'C'
            ? ['D', 'B', 'A']
            : ['C', 'B', 'A'];

    for (const fb of fallbackBands) {
      classId = await findGroupWithSpace(supabase, grade, subject, fb);
      if (classId) break;
    }
  }

  if (!classId) {
    allocationLog('enrollInSubjectBand:all_full_creating_overflow', {
      learnerId,
      grade,
      subject,
      band,
    });
    const tutorId = await getDefaultTutorId(supabase);
    const { schedule_day, schedule_time } = scheduleForTutoringSubject(subject);
    const { data: created } = await supabase
      .from('classes')
      .insert({
        tutor_id: tutorId,
        subject,
        grade,
        band,
        level,
        band_label: BAND_LABELS[band],
        schedule_day,
        schedule_time,
        max_enrollment: 8,
        is_active: true,
        schedule: 'TBC',
        learner_id: null,
      })
      .select('id')
      .single();
    classId = created?.id;
  }

  if (classId) {
    const { error } = await supabase.from('class_enrollments').upsert(
      {
        class_id: classId,
        learner_id: learnerId,
        status: 'active',
      },
      { onConflict: 'learner_id,class_id' }
    );
    if (error) {
      allocationLog('enrollInSubjectBand:upsert_error', {
        learnerId,
        classId,
        subject,
        band,
        error: error.message,
      });
    } else {
      await cancelDuplicateSubjectEnrollments(
        supabase,
        learnerId,
        grade,
        subject,
        classId
      );
      allocationLog('enrollInSubjectBand:upsert_ok', {
        learnerId,
        classId,
        subject,
        band,
      });
    }
  } else {
    allocationLog('enrollInSubjectBand:no_class_id', {
      learnerId,
      grade,
      subject,
      band,
    });
  }
}

/** Enrol learner into shared grade/subject/band class groups (same band for all subjects). */
export async function assignLearnerToClassGroups(
  supabase: ServiceClient,
  learnerId: string,
  grade: number,
  level: string | null,
  subjects: string[]
): Promise<void> {
  if (!subjects.length) return;

  const band = deriveBandFromLevel(level);
  for (const subject of subjects) {
    await enrollLearnerInSubjectBand(
      supabase,
      learnerId,
      grade,
      subject,
      band,
      level
    );
  }
}

/** Enrol with per-subject bands (e.g. from manual report marks). */
export async function assignLearnerToClassGroupsFromBands(
  supabase: ServiceClient,
  learnerId: string,
  grade: number,
  placements: { subject: string; band: ClassBand }[],
  level: string | null
): Promise<void> {
  const seen = new Set<string>();
  for (const { subject, band } of placements) {
    if (!subject || seen.has(subject)) continue;
    seen.add(subject);
    await enrollLearnerInSubjectBand(
      supabase,
      learnerId,
      grade,
      subject,
      band,
      level
    );
  }
}
