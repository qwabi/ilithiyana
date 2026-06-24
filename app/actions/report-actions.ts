'use server';

import { revalidatePath } from 'next/cache';
import {
  createServerSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server';
import { allocationLog } from '@/lib/allocation-log';
import {
  allocateLearnerFromReportMarks,
  extractionRowsToPlacementRows,
} from '@/lib/reports/allocate-from-report';
import {
  percentageToBand,
  percentageToLevel,
  bandChangeSeverity,
  type ClassBand,
} from '@/lib/reports/nsc';
import { sendEmail } from '@/lib/email';
import {
  levelChangeAlertEmail,
  reportConfirmReminderEmail,
} from '@/lib/email/templates';
import { brand } from '@/lib/site-config';
import { getLearnerForParentUser } from '@/lib/parent-learner-access';
import { ensureParentRowFromAuthUser } from '@/lib/parent-profile';
import { loadSessionForRequest } from '@/lib/onboarding/api-auth';
import { persistManualReportForLearner } from '@/lib/reports/persist-manual-report';
import { cascadeDeleteLearnerReport } from '@/lib/reports/delete-learner-report';
import {
  getSubjectById,
  getSubjectsForGrade,
  subjectDisplayName,
  toTutoringSubjectName,
} from '@/lib/curriculum/subjects';

export type ExtractionInput = {
  id?: string;
  subject_name_raw: string;
  subject_name_clean: string;
  percentage: number | null;
  is_offered: boolean;
  wrong_subject?: boolean;
};

export type ManualReportRow = {
  subjectId: string;
  percentage: number;
};

/** Onboarding reports step — session id proves ownership; no parent profile_id join required. */
export async function saveOnboardingManualReport(input: {
  sessionId: string;
  learnerId: string;
  term: string;
  academicYear: number;
  rows: ManualReportRow[];
}): Promise<
  { ok: true; reportId: string } | { ok: false; error: string }
> {
  const loaded = await loadSessionForRequest(input.sessionId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error };
  }

  const session = loaded.session;
  if (session.payment_status !== 'complete') {
    return {
      ok: false,
      error: 'Complete payment before adding school reports.',
    };
  }

  const learnerIds = session.learner_ids ?? [];
  if (!learnerIds.includes(input.learnerId)) {
    return {
      ok: false,
      error: 'This child is not part of your current enrolment session.',
    };
  }

  const confirmedBy =
    session.user_id ?? loaded.auth.userId ?? null;
  if (!confirmedBy) {
    return {
      ok: false,
      error: 'Account link missing. Refresh the page or sign in again.',
    };
  }

  if (session.parent_id && session.user_id) {
    const service = createServiceClient();
    await service
      .from('parents')
      .update({ profile_id: session.user_id })
      .eq('id', session.parent_id)
      .or(`profile_id.is.null,profile_id.eq.${session.user_id}`);
  }

  return persistManualReportForLearner({
    learnerId: input.learnerId,
    term: input.term,
    academicYear: input.academicYear,
    rows: input.rows,
    confirmedByProfileId: confirmedBy,
    runAllocation: true,
  });
}

export async function saveManualReport(input: {
  learnerId: string;
  term: string;
  academicYear: number;
  rows: ManualReportRow[];
}): Promise<
  { ok: true; reportId: string; allocationWarning?: string } | { ok: false; error: string }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const { learnerId, term, academicYear, rows } = input;

  if (!rows.length) {
    return { ok: false, error: 'Add at least one subject' };
  }

  const subjectIds = rows.map((r) => r.subjectId);
  if (new Set(subjectIds).size !== subjectIds.length) {
    return { ok: false, error: 'Duplicate subjects are not allowed' };
  }

  let access = await getLearnerForParentUser(user.id, learnerId);
  if (!access && user.email) {
    await ensureParentRowFromAuthUser(user.id, user.email);
    access = await getLearnerForParentUser(user.id, learnerId);
  }
  if (!access) {
    return { ok: false, error: 'Learner not found' };
  }

  const service = createServiceClient();
  const { data: learner } = await service
    .from('learners')
    .select('id, first_name, last_name, grade, subjects')
    .eq('id', learnerId)
    .single();

  if (!learner) {
    return { ok: false, error: 'Learner not found' };
  }

  const grade = Number(learner.grade);
  const allowedForGrade = new Set(
    getSubjectsForGrade(grade).map((s) => s.id)
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

  for (const row of rows) {
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
    const displayName = subjectDisplayName(subject);
    parsedRows.push({
      subject,
      subjectId: subject.id,
      percentage: pct,
      displayName,
      level: percentageToLevel(pct),
      band: percentageToBand(pct) as ClassBand,
      tutoringName: toTutoringSubjectName(subject),
    });
  }

  const now = new Date().toISOString();

  const { data: report, error: reportError } = await service
    .from('learner_reports')
    .insert({
      learner_id: learnerId,
      uploaded_by: user.id,
      file_url: null,
      file_type: 'manual',
      term,
      academic_year: academicYear,
      ocr_status: 'complete',
      ocr_completed_at: now,
      confirmed: true,
      confirmed_at: now,
      confirmed_by: user.id,
      notes: 'entry_method=manual',
    })
    .select('id')
    .single();

  if (reportError || !report) {
    console.error('saveManualReport insert report:', reportError);
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
      term,
      confidence: 1,
      needs_review: false,
      is_offered: r.subject.is_offered,
      parent_corrected: true,
    }))
  );

  if (extractionError) {
    console.error('saveManualReport extractions:', extractionError);
    return { ok: false, error: 'Failed to save subject results' };
  }

  for (const r of parsedRows) {
    const { error: levelError } = await service.from('learner_subject_levels').upsert(
      {
        learner_id: learnerId,
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
    if (levelError) {
      console.error('saveManualReport levels:', levelError);
      return { ok: false, error: 'Failed to save subject levels' };
    }
  }

  let allocationWarning: string | undefined;

  const placementRows = parsedRows.map((r) => ({
    subjectId: r.subjectId,
    tutoringName: r.tutoringName,
    subject: { is_offered: r.subject.is_offered },
    band: r.band,
    percentage: r.percentage,
  }));

  try {
    const allocation = await allocateLearnerFromReportMarks({
      supabase: service,
      learnerId,
      grade,
      parsedRows: placementRows,
      context: 'dashboard:saveManualReport',
    });

    allocationLog('saveManualReport:allocation_result', {
      learnerId,
      reportId,
      ...allocation,
    });

    if (
      allocation.enrolledSubjectIds.length > 0 &&
      allocation.sessionsCreated === 0
    ) {
      allocationWarning =
        'Class placement was updated. Upcoming session times are still being scheduled — check Schedules shortly.';
    }
  } catch (err) {
    allocationLog('saveManualReport:allocation_error', {
      learnerId,
      reportId,
      error: err instanceof Error ? err.message : String(err),
    });
    allocationWarning =
      'Results were saved but class placement may need a follow-up from our team.';
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/schedules');
  revalidatePath('/dashboard/reports');
  revalidatePath(`/dashboard/reports/${learnerId}`);
  revalidatePath(`/dashboard/reports/confirm/${reportId}`);

  return { ok: true, reportId, allocationWarning };
}

export async function confirmReportResults(
  reportId: string,
  rows: ExtractionInput[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const service = createServiceClient();

  const { data: report } = await service
    .from('learner_reports')
    .select(
      `
      *,
      learners (
        id, first_name, last_name, grade, subjects,
        parent_id,
        parents ( email, first_name, last_name )
      )
    `
    )
    .eq('id', reportId)
    .single();

  if (!report) return { ok: false, error: 'Report not found' };

  const learner = report.learners as {
    id: string;
    first_name: string;
    last_name: string;
    grade: number;
    subjects: string[];
    parents: { email: string; first_name: string; last_name: string } | null;
  };

  const offeredRows = rows.filter((r) => r.is_offered && !r.wrong_subject);

  for (const row of offeredRows) {
    const pct = row.percentage;
    const level = pct != null ? percentageToLevel(pct) : null;
    const band = pct != null ? percentageToBand(pct) : null;

    if (row.id) {
      await service
        .from('report_extractions')
        .update({
          percentage: pct,
          level,
          band,
          parent_corrected: true,
          original_percentage: pct,
          needs_review: false,
        })
        .eq('id', row.id);
    } else {
      await service.from('report_extractions').insert({
        report_id: reportId,
        subject_name_raw: row.subject_name_clean,
        subject_name_clean: row.subject_name_clean,
        percentage: pct,
        level,
        band,
        term: report.term,
        confidence: 1,
        needs_review: false,
        is_offered: true,
        parent_corrected: true,
      });
    }

    if (!level || !band) continue;

    const { data: existing } = await service
      .from('learner_subject_levels')
      .select('band')
      .eq('learner_id', learner.id)
      .eq('subject', row.subject_name_clean)
      .eq('term', report.term)
      .eq('academic_year', report.academic_year)
      .maybeSingle();

    const severity =
      existing?.band && band
        ? bandChangeSeverity(existing.band as ClassBand, band as ClassBand)
        : null;

    await service.from('learner_subject_levels').upsert(
      {
        learner_id: learner.id,
        subject: row.subject_name_clean,
        level,
        band,
        percentage: pct,
        term: report.term,
        academic_year: report.academic_year,
        source_report_id: reportId,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: 'learner_id,subject,term,academic_year' }
    );

    if (severity && existing?.band) {
      await service.from('learner_level_change_alerts').insert({
        learner_id: learner.id,
        subject: row.subject_name_clean,
        previous_band: existing.band,
        new_band: band,
        severity,
        term: report.term,
        academic_year: report.academic_year,
        source_report_id: reportId,
      });

      const adminEmail = process.env.ADMIN_EMAIL ?? 'info@ilithiyana.co.za';
      const tpl = levelChangeAlertEmail({
        learnerName: `${learner.first_name} ${learner.last_name}`,
        subject: row.subject_name_clean,
        previousBand: existing.band,
        newBand: band,
        severity,
        term: report.term,
        year: report.academic_year,
      });
      await sendEmail({
        to: adminEmail,
        subject: tpl.subject,
        html: tpl.html,
      }).catch(console.error);
    }
  }

  await service
    .from('learner_reports')
    .update({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
    })
    .eq('id', reportId);

  const placementRows = extractionRowsToPlacementRows(
    offeredRows.map((r) => ({
      subject_name_clean: r.subject_name_clean,
      percentage: r.percentage,
      is_offered: r.is_offered,
      wrong_subject: r.wrong_subject,
    })),
    learner.grade
  );

  try {
    const allocation = await allocateLearnerFromReportMarks({
      supabase: service,
      learnerId: learner.id,
      grade: learner.grade,
      parsedRows: placementRows,
      context: 'dashboard:confirmReportResults',
    });

    allocationLog('confirmReportResults:allocation_result', {
      reportId,
      learnerId: learner.id,
      placementRowCount: placementRows.length,
      ...allocation,
    });
  } catch (err) {
    allocationLog('confirmReportResults:allocation_error', {
      reportId,
      learnerId: learner.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/schedules');
  revalidatePath(`/dashboard/reports/confirm/${reportId}`);
  return { ok: true };
}

export async function deleteLearnerReport(reportId: string): Promise<
  | { ok: true; learnerId: string }
  | { ok: false; error: string }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  let service;
  try {
    service = createServiceClient();
  } catch {
    return {
      ok: false,
      error: 'Server configuration error. Please contact support.',
    };
  }

  const { data: owned, error: ownedError } = await service
    .from('learner_reports')
    .select(
      `
      id,
      learner_id,
      learners!inner (
        parent_id,
        parents!inner ( profile_id )
      )
    `
    )
    .eq('id', reportId)
    .maybeSingle();

  if (ownedError) {
    console.error('deleteLearnerReport ownership:', ownedError);
    return { ok: false, error: 'Could not verify report access' };
  }

  if (!owned) return { ok: false, error: 'Report not found' };

  const learner = owned.learners as {
    parent_id: string;
    parents: { profile_id: string } | { profile_id: string }[];
  };
  const parent = Array.isArray(learner.parents)
    ? learner.parents[0]
    : learner.parents;

  if (parent?.profile_id !== user.id) {
    const access = await getLearnerForParentUser(
      user.id,
      owned.learner_id as string
    );
    if (!access) {
      return { ok: false, error: 'You do not have access to this report' };
    }
  }

  const learnerId = owned.learner_id as string;

  const result = await cascadeDeleteLearnerReport({
    supabase: service,
    reportId,
    context: 'dashboard:deleteLearnerReport',
  });

  if (!result.ok) return result;

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/schedules');
  revalidatePath('/dashboard/reports');
  revalidatePath(`/dashboard/reports/${learnerId}`);

  return { ok: true, learnerId };
}

export async function sendReportConfirmReminder(reportId: string) {
  const supabase = createServiceClient();
  const { data: report } = await supabase
    .from('learner_reports')
    .select('id, learners(first_name, last_name, parents(email, first_name))')
    .eq('id', reportId)
    .single();

  if (!report) return { ok: false };
  const learner = report.learners as {
    first_name: string;
    last_name: string;
    parents: { email: string; first_name: string } | null;
  };
  const parent = learner.parents;
  if (!parent?.email) return { ok: false };

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;
  const tpl = reportConfirmReminderEmail({
    parentName: parent.first_name,
    learnerName: `${learner.first_name} ${learner.last_name}`,
    confirmUrl: `${site}/dashboard/reports/confirm/${reportId}`,
  });
  await sendEmail({ to: parent.email, subject: tpl.subject, html: tpl.html });
  return { ok: true };
}
