import type { createServiceClient } from '@/lib/supabase/server';
import { allocationLog } from '@/lib/allocation-log';
import { ensureSessionsForLearnerEnrollments } from '@/lib/class-schedules';
import {
  resolveLearnerSubjectIds,
  resolveSubjectRef,
} from '@/lib/curriculum/learner-subjects';
import { getSubjectById, toTutoringSubjectName } from '@/lib/curriculum/subjects';
import {
  enrollLearnerFromManualReportRows,
  type ManualReportPlacementRow,
} from '@/lib/reports/enroll-from-manual-report';
import { percentageToBand, type ClassBand } from '@/lib/reports/nsc';

type ServiceClient = ReturnType<typeof createServiceClient>;

export async function resolveEnrolledSubjectIdsForAllocation(
  supabase: ServiceClient,
  learnerId: string,
  grade: number,
  reportSubjectIds: string[]
): Promise<string[]> {
  const { data: learner } = await supabase
    .from('learners')
    .select('subjects')
    .eq('id', learnerId)
    .maybeSingle();

  const { data: app } = await supabase
    .from('applications')
    .select('id, subjects')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const fromProfile = resolveLearnerSubjectIds(
    (app?.subjects as string[]) ?? (learner?.subjects as string[]) ?? [],
    grade
  );

  if (fromProfile.length) {
    return fromProfile;
  }

  const fromReport = reportSubjectIds.filter((id) => {
    const sub = getSubjectById(id);
    return sub?.is_offered && sub.grades.includes(grade);
  });

  return fromReport;
}

export type AllocateFromReportResult = {
  enrolledSubjectIds: string[];
  sessionsCreated: number;
  applicationId: string | null;
};

/**
 * Shared post-report path: per-subject bands from marks, class enrollments, then sessions.
 * Used by dashboard save/confirm and aligned with onboarding enrollment helpers.
 */
export async function allocateLearnerFromReportMarks(opts: {
  supabase: ServiceClient;
  learnerId: string;
  grade: number;
  parsedRows: ManualReportPlacementRow[];
  context: string;
}): Promise<AllocateFromReportResult> {
  const { supabase, learnerId, grade, parsedRows, context } = opts;

  allocationLog('allocateFromReport:start', {
    context,
    learnerId,
    grade,
    reportRowCount: parsedRows.length,
    reportSubjectIds: parsedRows.map((r) => r.subjectId),
  });

  const { data: app } = await supabase
    .from('applications')
    .select('id, subjects')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const applicationId = (app?.id as string) ?? null;
  const enrolledSubjectIds = await resolveEnrolledSubjectIdsForAllocation(
    supabase,
    learnerId,
    grade,
    parsedRows.map((r) => r.subjectId)
  );

  allocationLog('allocateFromReport:resolved_subjects', {
    context,
    learnerId,
    applicationId,
    enrolledSubjectIds,
    appSubjectsRaw: app?.subjects,
  });

  if (!enrolledSubjectIds.length) {
    allocationLog('allocateFromReport:skip_no_enrolled_subjects', {
      context,
      learnerId,
    });
    return { enrolledSubjectIds: [], sessionsCreated: 0, applicationId };
  }

  if (!parsedRows.length) {
    allocationLog('allocateFromReport:skip_no_report_rows', {
      context,
      learnerId,
    });
    return { enrolledSubjectIds, sessionsCreated: 0, applicationId };
  }

  await enrollLearnerFromManualReportRows({
    supabase,
    learnerId,
    grade,
    enrolledSubjects: enrolledSubjectIds,
    parsedRows,
    applicationId,
    context,
  });

  const { created: sessionsCreated } = await ensureSessionsForLearnerEnrollments(
    supabase,
    learnerId,
    context
  );

  allocationLog('allocateFromReport:done', {
    context,
    learnerId,
    applicationId,
    enrolledSubjectIds,
    sessionsCreated,
  });

  return { enrolledSubjectIds, sessionsCreated, applicationId };
}

/** Map legacy confirm-form rows (display names) to placement rows. */
export function extractionRowsToPlacementRows(
  rows: {
    subject_name_clean: string;
    percentage: number | null;
    is_offered: boolean;
    wrong_subject?: boolean;
  }[],
  grade: number
): ManualReportPlacementRow[] {
  const out: ManualReportPlacementRow[] = [];

  for (const row of rows) {
    if (!row.is_offered || row.wrong_subject || row.percentage == null) continue;

    const subjectId = resolveSubjectRef(row.subject_name_clean, grade);
    if (!subjectId) {
      allocationLog('extractionRows:unresolved_subject', {
        grade,
        subject_name_clean: row.subject_name_clean,
      });
      continue;
    }

    const subject = getSubjectById(subjectId);
    if (!subject) continue;

    out.push({
      subjectId,
      tutoringName: toTutoringSubjectName(subject),
      subject: { is_offered: subject.is_offered },
      band: percentageToBand(row.percentage) as ClassBand,
      percentage: row.percentage,
    });
  }

  return out;
}
