import type { createServiceClient } from '@/lib/supabase/server';
import { allocationLog } from '@/lib/allocation-log';
import {
  clearUpcomingSessionsForLearnerUnenrolledClasses,
} from '@/lib/class-schedules';
import { resolveSubjectRef } from '@/lib/curriculum/learner-subjects';
import {
  getSubjectById,
  toTutoringSubjectName,
} from '@/lib/curriculum/subjects';
import {
  allocateLearnerFromReportMarks,
  extractionRowsToPlacementRows,
} from '@/lib/reports/allocate-from-report';
import {
  canonicalTutoringSubjectName,
  tutoringSubjectInSet,
  tutoringSubjectsFromReportRows,
} from '@/lib/reports/report-placement-subjects';
import { APPLICATION_DOCUMENTS_BUCKET } from '@/lib/supabase/storage';

type ServiceClient = ReturnType<typeof createServiceClient>;

function isStoragePath(value: string | null | undefined): boolean {
  return Boolean(
    value &&
      !value.startsWith('http://') &&
      !value.startsWith('https://')
  );
}

/**
 * Remove class placements and upcoming lessons caused by a report, then delete the report row.
 * Uses service role — caller must verify parent ownership first.
 */
export async function cascadeDeleteLearnerReport(opts: {
  supabase: ServiceClient;
  reportId: string;
  context?: string;
}): Promise<
  | {
      ok: true;
      cancelledEnrollments: number;
      removedSessions: number;
      reallocatedFromReportId: string | null;
    }
  | { ok: false; error: string }
> {
  const context = opts.context ?? 'cascadeDeleteLearnerReport';
  const { supabase, reportId } = opts;

  const { data: report, error: reportError } = await supabase
    .from('learner_reports')
    .select(
      'id, learner_id, term, academic_year, file_url, file_type, confirmed'
    )
    .eq('id', reportId)
    .maybeSingle();

  if (reportError || !report) {
    return { ok: false, error: 'Report not found' };
  }

  const learnerId = report.learner_id as string;
  const term = report.term as string;
  const academicYear = report.academic_year as number;
  const isConfirmed = Boolean(report.confirmed);

  const { data: learner } = await supabase
    .from('learners')
    .select('grade')
    .eq('id', learnerId)
    .maybeSingle();

  if (!learner) {
    return { ok: false, error: 'Learner not found' };
  }

  const grade = Number(learner.grade);

  const [{ data: extractions }, { data: reportLevels }] = await Promise.all([
    supabase
      .from('report_extractions')
      .select('subject_name_clean, is_offered')
      .eq('report_id', reportId),
    supabase
      .from('learner_subject_levels')
      .select('subject')
      .eq('source_report_id', reportId),
  ]);

  let reportTutoringSubjects = tutoringSubjectsFromReportRows(
    extractions ?? [],
    (reportLevels ?? []).map((l) => ({ subject: l.subject as string })),
    grade
  );

  /** Confirmed report with no rows — undo all active placements for this child. */
  if (isConfirmed && reportTutoringSubjects.size === 0) {
    const { data: activeEnrollments } = await supabase
      .from('class_enrollments')
      .select('classes!inner ( subject )')
      .eq('learner_id', learnerId)
      .eq('status', 'active');

    for (const row of activeEnrollments ?? []) {
      const cls = row.classes as { subject: string } | { subject: string }[];
      const meta = Array.isArray(cls) ? cls[0] : cls;
      if (meta?.subject) {
        reportTutoringSubjects.add(canonicalTutoringSubjectName(meta.subject));
      }
    }
  }

  allocationLog('deleteReport:start', {
    context,
    reportId,
    learnerId,
    reportTutoringSubjects: [...reportTutoringSubjects],
  });

  const { data: termLevels } = await supabase
    .from('learner_subject_levels')
    .select('subject, source_report_id')
    .eq('learner_id', learnerId)
    .eq('term', term)
    .eq('academic_year', academicYear);

  const tutoringKeptByOtherReports = new Set<string>();
  for (const lvl of termLevels ?? []) {
    if (lvl.source_report_id === reportId) continue;
    const clean = (lvl.subject as string)?.trim();
    if (!clean) continue;
    const subjectId = resolveSubjectRef(clean, grade);
    const subject = subjectId ? getSubjectById(subjectId) : null;
    const tutoring = subject ? toTutoringSubjectName(subject) : null;
    if (tutoring) {
      tutoringKeptByOtherReports.add(canonicalTutoringSubjectName(tutoring));
    }
  }

  const unenrolledClassIds: string[] = [];
  let cancelledEnrollments = 0;

  if (reportTutoringSubjects.size > 0) {
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select(
        `
        id,
        class_id,
        classes!inner ( subject, grade, learner_id )
      `
      )
      .eq('learner_id', learnerId)
      .eq('status', 'active');

    for (const row of enrollments ?? []) {
      const cls = row.classes as
        | { subject: string; grade: number; learner_id: string | null }
        | { subject: string; grade: number; learner_id: string | null }[];
      const meta = Array.isArray(cls) ? cls[0] : cls;
      if (!meta || meta.grade !== grade) continue;
      if (!tutoringSubjectInSet(meta.subject, reportTutoringSubjects)) continue;

      if (tutoringKeptByOtherReports.has(canonicalTutoringSubjectName(meta.subject))) {
        allocationLog('deleteReport:skip_enrollment_other_report_level', {
          context,
          reportId,
          subject: meta.subject,
        });
        continue;
      }

      const classId = row.class_id as string;
      const { error: cancelError } = await supabase
        .from('class_enrollments')
        .update({ status: 'cancelled' })
        .eq('id', row.id as string);

      if (cancelError) {
        allocationLog('deleteReport:cancel_enrollment_error', {
          context,
          reportId,
          enrollmentId: row.id,
          error: cancelError.message,
        });
        continue;
      }

      cancelledEnrollments += 1;
      unenrolledClassIds.push(classId);
      allocationLog('deleteReport:cancelled_enrollment', {
        context,
        reportId,
        classId,
        subject: meta.subject,
      });
    }
  }

  let removedSessions = 0;
  if (unenrolledClassIds.length > 0) {
    removedSessions = await clearUpcomingSessionsForLearnerUnenrolledClasses(
      supabase,
      learnerId,
      unenrolledClassIds,
      context
    );
  }

  await supabase
    .from('learner_level_change_alerts')
    .delete()
    .eq('source_report_id', reportId);

  await supabase
    .from('learner_subject_levels')
    .delete()
    .eq('source_report_id', reportId);

  if (isStoragePath(report.file_url as string | null)) {
    const path = report.file_url as string;
    const { error: storageError } = await supabase.storage
      .from(APPLICATION_DOCUMENTS_BUCKET)
      .remove([path]);
    if (storageError) {
      allocationLog('deleteReport:storage_remove_error', {
        context,
        reportId,
        path,
        error: storageError.message,
      });
    }
  }

  const { error: deleteError } = await supabase
    .from('learner_reports')
    .delete()
    .eq('id', reportId);

  if (deleteError) {
    allocationLog('deleteReport:delete_error', {
      context,
      reportId,
      error: deleteError.message,
    });
    return {
      ok: false,
      error: deleteError.message || 'Failed to delete report',
    };
  }

  let reallocatedFromReportId: string | null = null;

  const { data: nextReport } = await supabase
    .from('learner_reports')
    .select('id')
    .eq('learner_id', learnerId)
    .eq('confirmed', true)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (nextReport?.id) {
    reallocatedFromReportId = nextReport.id as string;
    const { data: nextExtractions } = await supabase
      .from('report_extractions')
      .select('subject_name_clean, percentage, is_offered')
      .eq('report_id', nextReport.id)
      .not('percentage', 'is', null);

    const placementRows = extractionRowsToPlacementRows(
      (nextExtractions ?? []).map((r) => ({
        subject_name_clean: r.subject_name_clean as string,
        percentage: r.percentage as number,
        is_offered: r.is_offered as boolean,
      })),
      grade
    );

    if (placementRows.length > 0) {
      try {
        await allocateLearnerFromReportMarks({
          supabase,
          learnerId,
          grade,
          parsedRows: placementRows,
          context: `${context}:reallocateAfterDelete`,
        });
      } catch (err) {
        allocationLog('deleteReport:reallocate_error', {
          context,
          reportId,
          nextReportId: nextReport.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const { count: activeCount } = await supabase
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('learner_id', learnerId)
    .eq('status', 'active');

  if ((activeCount ?? 0) === 0) {
    await supabase
      .from('learners')
      .update({ allocation_status: 'pending_report' })
      .eq('id', learnerId);
  }

  allocationLog('deleteReport:done', {
    context,
    reportId,
    cancelledEnrollments,
    removedSessions,
    reallocatedFromReportId,
  });

  return {
    ok: true,
    cancelledEnrollments,
    removedSessions,
    reallocatedFromReportId,
  };
}
