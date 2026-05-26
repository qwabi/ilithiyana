import { createServiceClient } from '@/lib/supabase/server';
import {
  getSubjectById,
  getSubjectsForGrade,
  subjectDisplayName,
  toTutoringSubjectName,
} from '@/lib/curriculum/subjects';
import { percentageToBand, percentageToLevel, type ClassBand } from '@/lib/reports/nsc';
import { allocateLearnerFromReportMarks } from '@/lib/reports/allocate-from-report';

export type ManualReportRowInput = {
  subjectId: string;
  percentage: number;
};

export async function persistManualReportForLearner(opts: {
  learnerId: string;
  term: string;
  academicYear: number;
  rows: ManualReportRowInput[];
  confirmedByProfileId: string;
  runAllocation?: boolean;
}): Promise<{ ok: true; reportId: string } | { ok: false; error: string }> {
  const service = createServiceClient();
  const { data: learner } = await service
    .from('learners')
    .select(
      'id, first_name, last_name, grade, subjects, parents!inner(email, first_name, profile_id)'
    )
    .eq('id', opts.learnerId)
    .single();

  if (!learner) {
    return { ok: false, error: 'Learner not found' };
  }

  const grade = Number(learner.grade);
  const allowedForGrade = new Set(
    getSubjectsForGrade(grade).filter((s) => s.is_offered).map((s) => s.id)
  );

  const parsedRows: {
    subject: NonNullable<ReturnType<typeof getSubjectById>>;
    subjectId: string;
    percentage: number;
    displayName: string;
    level: number;
    band: ClassBand;
    tutoringName: string | null;
  }[] = [];

  for (const row of opts.rows) {
    if (!allowedForGrade.has(row.subjectId)) {
      return { ok: false, error: 'Invalid subject for this grade' };
    }
    const pct = Math.round(row.percentage);
    if (pct < 0 || pct > 100) {
      return { ok: false, error: 'Percentages must be between 0 and 100' };
    }
    const subject = getSubjectById(row.subjectId);
    if (!subject) {
      return { ok: false, error: 'Unknown subject' };
    }
    parsedRows.push({
      subject,
      subjectId: subject.id,
      percentage: pct,
      displayName: subjectDisplayName(subject),
      level: percentageToLevel(pct),
      band: percentageToBand(pct) as ClassBand,
      tutoringName: toTutoringSubjectName(subject),
    });
  }

  if (!parsedRows.length) {
    return { ok: false, error: 'Add at least one subject mark' };
  }

  const now = new Date().toISOString();
  const { term, academicYear } = opts;

  const { data: report, error: reportError } = await service
    .from('learner_reports')
    .insert({
      learner_id: opts.learnerId,
      uploaded_by: opts.confirmedByProfileId,
      file_url: null,
      file_type: 'manual',
      term,
      academic_year: academicYear,
      ocr_status: 'complete',
      ocr_completed_at: now,
      confirmed: true,
      confirmed_at: now,
      confirmed_by: opts.confirmedByProfileId,
      notes: 'entry_method=manual',
    })
    .select('id')
    .single();

  if (reportError || !report) {
    console.error('persistManualReportForLearner insert:', reportError);
    return { ok: false, error: 'Failed to create report record' };
  }

  const reportId = report.id as string;

  const { error: extractionError } = await service.from('report_extractions').insert(
    parsedRows.map((r) => ({
      report_id: reportId,
      subject_name_raw: r.displayName,
      subject_name_clean: r.displayName,
      percentage: r.percentage,
      level: r.level,
      band: r.band,
      term: opts.term,
      confidence: 1,
      needs_review: false,
      is_offered: r.subject.is_offered,
      parent_corrected: true,
    }))
  );

  if (extractionError) {
    return { ok: false, error: 'Failed to save subject results' };
  }

  for (const r of parsedRows) {
    await service.from('learner_subject_levels').upsert(
      {
        learner_id: opts.learnerId,
        subject: r.displayName,
        level: r.level,
        band: r.band,
        percentage: r.percentage,
        term,
        academic_year: academicYear,
        source_report_id: reportId,
        confirmed_at: now,
      },
      { onConflict: 'learner_id,subject,term,academic_year' }
    );
  }

  if (opts.runAllocation !== false) {
    try {
      await allocateLearnerFromReportMarks({
        supabase: service,
        learnerId: opts.learnerId,
        grade,
        parsedRows: parsedRows.map((r) => ({
          subjectId: r.subjectId,
          tutoringName: r.tutoringName,
          subject: { is_offered: r.subject.is_offered },
          band: r.band,
          percentage: r.percentage,
        })),
        context: 'enrollment:persistManualReport',
      });
    } catch (err) {
      console.error('persistManualReportForLearner enrollment:', err);
    }
  }

  return { ok: true, reportId };
}
