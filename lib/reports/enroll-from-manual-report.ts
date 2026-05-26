import type { createServiceClient } from '@/lib/supabase/server';
import { allocationLog } from '@/lib/allocation-log';
import {
  assignLearnerToClassGroups,
  assignLearnerToClassGroupsFromBands,
  deriveBandFromLevel,
} from '@/lib/class-enrollments';
import { ensureSessionsForLearnerEnrollments } from '@/lib/class-schedules';
import {
  buildTutoringPlacementsFromSubjectIds,
  normalizeSubjectIds,
  resolveLearnerSubjectIds,
  subjectIdsToTutoringNames,
} from '@/lib/curriculum/learner-subjects';
import type { ClassBand } from '@/lib/reports/nsc';
import { deriveLearnerLevelFromReportRows } from '@/lib/reports/learner-level';

type ServiceClient = ReturnType<typeof createServiceClient>;

export type ManualReportPlacementRow = {
  subjectId: string;
  tutoringName: string | null;
  subject: { is_offered: boolean };
  band: ClassBand;
  percentage: number;
};

/** Create or refresh class enrollments from manual report marks. */
export async function enrollLearnerFromManualReportRows(opts: {
  supabase: ServiceClient;
  learnerId: string;
  grade: number;
  enrolledSubjects: string[];
  parsedRows: ManualReportPlacementRow[];
  applicationId?: string | null;
  context?: string;
}): Promise<void> {
  const context = opts.context ?? 'enrollFromManualReportRows';
  const { supabase, learnerId, grade, enrolledSubjects, parsedRows } = opts;

  allocationLog('enrollFromManualReport:start', {
    context,
    learnerId,
    grade,
    enrolledSubjects,
    parsedRowCount: parsedRows.length,
    applicationId: opts.applicationId ?? null,
  });

  if (!enrolledSubjects.length) {
    allocationLog('enrollFromManualReport:skip_no_subjects', { context, learnerId });
    return;
  }

  const derivedLevel = deriveLearnerLevelFromReportRows(
    parsedRows.map((r) => ({ percentage: r.percentage }))
  );

  const { error: learnerUpdateError } = await supabase
    .from('learners')
    .update({
      level: derivedLevel,
      allocation_status: 'enrolled',
    })
    .eq('id', learnerId);

  if (learnerUpdateError) {
    allocationLog('enrollFromManualReport:learner_update_error', {
      context,
      learnerId,
      error: learnerUpdateError.message,
    });
  } else {
    allocationLog('enrollFromManualReport:learner_updated', {
      context,
      learnerId,
      derivedLevel,
    });
  }

  const enrolledIds = normalizeSubjectIds(enrolledSubjects, grade);

  const bandBySubjectId = new Map<string, ClassBand>();
  for (const row of parsedRows) {
    if (row.subject.is_offered && enrolledIds.includes(row.subjectId)) {
      bandBySubjectId.set(row.subjectId, row.band);
    }
  }

  allocationLog('enrollFromManualReport:bands', {
    context,
    learnerId,
    enrolledIds,
    bands: Object.fromEntries(bandBySubjectId),
  });

  const defaultBand = deriveBandFromLevel(derivedLevel);
  const placements = buildTutoringPlacementsFromSubjectIds(
    enrolledIds,
    bandBySubjectId,
    defaultBand
  );

  allocationLog('enrollFromManualReport:placements', {
    context,
    learnerId,
    placements,
    defaultBand,
  });

  await assignLearnerToClassGroupsFromBands(
    supabase,
    learnerId,
    grade,
    placements,
    derivedLevel
  );

  const { data: enrollmentRows } = await supabase
    .from('class_enrollments')
    .select('class_id, status')
    .eq('learner_id', learnerId)
    .eq('status', 'active');

  allocationLog('enrollFromManualReport:enrollments_after', {
    context,
    learnerId,
    count: enrollmentRows?.length ?? 0,
    classIds: (enrollmentRows ?? []).map((r) => r.class_id),
  });

  if (opts.applicationId) {
    const { error: appError } = await supabase
      .from('applications')
      .update({ allocation_status: 'enrolled' })
      .eq('id', opts.applicationId);

    if (appError) {
      allocationLog('enrollFromManualReport:application_update_error', {
        context,
        applicationId: opts.applicationId,
        error: appError.message,
      });
    }
  }

  allocationLog('enrollFromManualReport:done', { context, learnerId });
}

/** Baseline enrollments when no report marks exist yet (onboarding complete / profile save). */
export async function ensureLearnerClassEnrollments(opts: {
  supabase: ServiceClient;
  learnerId: string;
  grade: number;
  level: string | null;
  subjects: string[];
  context?: string;
}): Promise<void> {
  const context = opts.context ?? 'ensureLearnerClassEnrollments';
  const { supabase, learnerId, grade, level, subjects } = opts;

  allocationLog('ensureClassEnrollments:start', {
    context,
    learnerId,
    grade,
    level,
    subjects,
  });

  if (!subjects.length) {
    allocationLog('ensureClassEnrollments:skip_no_subjects', { context, learnerId });
    return;
  }

  const { count, error: countError } = await supabase
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('learner_id', learnerId)
    .eq('status', 'active');

  if (countError) {
    allocationLog('ensureClassEnrollments:count_error', {
      context,
      learnerId,
      error: countError.message,
    });
  }

  if ((count ?? 0) > 0) {
    allocationLog('ensureClassEnrollments:existing_enrollments', {
      context,
      learnerId,
      count,
    });
    await ensureSessionsForLearnerEnrollments(supabase, learnerId, context);
    return;
  }

  const tutoringNames = subjectIdsToTutoringNames(
    resolveLearnerSubjectIds(subjects, grade)
  );

  allocationLog('ensureClassEnrollments:assign', {
    context,
    learnerId,
    tutoringNames,
  });

  await assignLearnerToClassGroups(supabase, learnerId, grade, level, tutoringNames);

  const { data: after } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('learner_id', learnerId)
    .eq('status', 'active');

  allocationLog('ensureClassEnrollments:enrollments_after', {
    context,
    learnerId,
    count: after?.length ?? 0,
    classIds: (after ?? []).map((r) => r.class_id),
  });

  await ensureSessionsForLearnerEnrollments(supabase, learnerId, context);

  allocationLog('ensureClassEnrollments:done', { context, learnerId });
}
