'use server';

import { revalidatePath } from 'next/cache';
import {
  createServerSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server';
import { allocationLog } from '@/lib/allocation-log';
import { getLearnerForParentUser } from '@/lib/parent-learner-access';
import {
  resolveLearnerSubjectIds,
  resolveSubjectRef,
} from '@/lib/curriculum/learner-subjects';
import {
  getSubjectById,
  getSubjectsForGrade,
  subjectDisplayName,
  toTutoringSubjectName,
} from '@/lib/curriculum/subjects';
import { allocateLearnerFromReportMarks } from '@/lib/reports/allocate-from-report';
import { ensureLearnerClassEnrollments } from '@/lib/reports/enroll-from-manual-report';
import type { ManualReportPlacementRow } from '@/lib/reports/enroll-from-manual-report';
import { percentageToBand, type ClassBand } from '@/lib/reports/nsc';

export async function syncLearnerClassesAndSchedule(learnerId: string): Promise<
  | { ok: true; message: string; sessionsCreated: number }
  | { ok: false; error: string }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const access = await getLearnerForParentUser(user.id, learnerId);
  if (!access) return { ok: false, error: 'Learner not found' };

  const service = createServiceClient();
  const grade = Number(access.learner.grade);

  const { data: latestReport } = await service
    .from('learner_reports')
    .select('id, term, academic_year')
    .eq('learner_id', learnerId)
    .eq('confirmed', true)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionsCreated = 0;

  if (latestReport) {
    const { data: extractions } = await service
      .from('report_extractions')
      .select('subject_name_clean, percentage, is_offered')
      .eq('report_id', latestReport.id)
      .not('percentage', 'is', null);

    const parsedRows: ManualReportPlacementRow[] = [];

    for (const row of extractions ?? []) {
      if (!row.is_offered || row.percentage == null) continue;
      const subjectId = resolveSubjectRefFromDisplay(
        row.subject_name_clean as string,
        grade
      );
      const subject = subjectId ? getSubjectById(subjectId) : null;
      if (!subject || !subjectId) continue;
      parsedRows.push({
        subjectId,
        tutoringName: toTutoringSubjectName(subject),
        subject: { is_offered: subject.is_offered },
        band: percentageToBand(row.percentage as number) as ClassBand,
        percentage: row.percentage as number,
      });
    }

    if (parsedRows.length > 0) {
      allocationLog('syncLearnerPlacement:from_report', {
        learnerId,
        reportId: latestReport.id,
        rowCount: parsedRows.length,
      });
      const result = await allocateLearnerFromReportMarks({
        supabase: service,
        learnerId,
        grade,
        parsedRows,
        context: 'dashboard:syncLearnerClassesAndSchedule',
      });
      sessionsCreated = result.sessionsCreated;
    }
  }

  if (sessionsCreated === 0) {
    const subjectIds = resolveLearnerSubjectIds(
      (access.learner.subjects as string[]) ?? [],
      grade
    );
    if (!subjectIds.length) {
      return {
        ok: false,
        error: 'Add subjects on the child profile or save a school report first.',
      };
    }

    allocationLog('syncLearnerPlacement:baseline', { learnerId, subjectIds });
    await ensureLearnerClassEnrollments({
      supabase: service,
      learnerId,
      grade,
      level: (access.learner.level as string | null) ?? null,
      subjects: subjectIds,
      context: 'dashboard:syncLearnerClassesAndSchedule',
    });
  }

  revalidatePath('/dashboard/schedules');
  revalidatePath(`/dashboard/schedules/${learnerId}`);
  revalidatePath('/dashboard/children');

  return {
    ok: true,
    message: 'Class placement and schedule updated.',
    sessionsCreated,
  };
}

function resolveSubjectRefFromDisplay(name: string, grade: number): string | null {
  const id = resolveSubjectRef(name, grade);
  if (id) return id;
  const match = getSubjectsForGrade(grade).find(
    (s) => subjectDisplayName(s) === name || s.name === name
  );
  return match?.id ?? null;
}
