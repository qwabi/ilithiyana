'use server';

import { revalidatePath } from 'next/cache';
import {
  createServerSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server';
import { allocateLearnerToClasses } from '@/lib/reports/allocate-classes';
import {
  percentageToBand,
  percentageToLevel,
  bandChangeSeverity,
  type ClassBand,
} from '@/lib/reports/nsc';
import { processLearnerReport, createReportFromLeadStorage } from '@/lib/reports/process-report';
import {
  uploadApplicationDocument,
  buildLearnerReportStoragePath,
} from '@/lib/supabase/storage';
import { sendEmail } from '@/lib/email';
import {
  levelChangeAlertEmail,
  reportConfirmReminderEmail,
  reportUploadedEmail,
} from '@/lib/email/templates';
import { brand } from '@/lib/site-config';
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

export async function triggerReportOcrAfterPayment(opts: {
  leadId: string;
  learnerId: string;
  applicationId: string;
  reportStoragePath: string | null;
  parentProfileId?: string | null;
}) {
  if (!opts.reportStoragePath) {
    const supabase = createServiceClient();
    await supabase
      .from('applications')
      .update({ allocation_status: 'pending_report' })
      .eq('id', opts.applicationId);
    await supabase
      .from('learners')
      .update({ allocation_status: 'pending_report' })
      .eq('id', opts.learnerId);
    return { reportId: null };
  }

  const reportId = await createReportFromLeadStorage({
    learnerId: opts.learnerId,
    applicationId: opts.applicationId,
    storagePath: opts.reportStoragePath,
    uploadedByProfileId: opts.parentProfileId ?? null,
  });

  void processLearnerReport(reportId).catch((e) =>
    console.error('Background OCR error:', e)
  );

  return { reportId };
}

export async function uploadLearnerReport(
  learnerId: string,
  formData: FormData
): Promise<{ ok: boolean; reportId?: string; error?: string }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const file = formData.get('file');
  const term = String(formData.get('term') ?? 'Year End');
  const academicYear = parseInt(String(formData.get('academicYear') ?? new Date().getFullYear()), 10);

  if (!file || !(file instanceof File)) {
    return { ok: false, error: 'No file provided' };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: 'File must be 10 MB or smaller' };
  }

  const allowed = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]);
  if (file.type && !allowed.has(file.type)) {
    return { ok: false, error: 'Only PDF and image files are allowed' };
  }

  const { data: learner } = await supabase
    .from('learners')
    .select('id, first_name, last_name, parent_id, parents!inner(email, first_name, profile_id)')
    .eq('id', learnerId)
    .eq('parents.profile_id', user.id)
    .single();

  if (!learner) return { ok: false, error: 'Learner not found' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = buildLearnerReportStoragePath(
    learnerId,
    term,
    academicYear,
    file.name
  );

  const { path: storedPath } = await uploadApplicationDocument(
    buffer,
    path,
    file.type || undefined
  );

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  const fileType =
    ext === 'pdf' ? 'pdf' : ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpg';

  const service = createServiceClient();
  const { data: report, error } = await service
    .from('learner_reports')
    .insert({
      learner_id: learnerId,
      uploaded_by: user.id,
      file_url: storedPath,
      file_type: fileType,
      term,
      academic_year: academicYear,
      ocr_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !report) {
    return { ok: false, error: error?.message ?? 'Failed to save report' };
  }

  const parent = learner.parents as { email: string; first_name: string } | null;
  if (parent?.email) {
    const tpl = reportUploadedEmail({
      parentName: parent.first_name,
      learnerName: `${learner.first_name} ${learner.last_name}`,
      term,
      year: academicYear,
    });
    await sendEmail({ to: parent.email, subject: tpl.subject, html: tpl.html }).catch(
      console.error
    );
  }

  void processLearnerReport(report.id).catch(console.error);

  revalidatePath(`/dashboard/reports/${learnerId}`);
  revalidatePath('/dashboard/reports');
  return { ok: true, reportId: report.id };
}

export type ManualReportRow = {
  subjectId: string;
  percentage: number;
};

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

  const { data: learner } = await supabase
    .from('learners')
    .select(
      'id, first_name, last_name, grade, subjects, parents!inner(email, first_name, last_name, profile_id)'
    )
    .eq('id', learnerId)
    .eq('parents.profile_id', user.id)
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
      percentage: pct,
      displayName,
      level: percentageToLevel(pct),
      band: percentageToBand(pct) as ClassBand,
      tutoringName: toTutoringSubjectName(subject),
    });
  }

  const service = createServiceClient();
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

  const { data: app } = await service
    .from('applications')
    .select('id, subjects')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const applicationId = app?.id;
  const parent = learner.parents as {
    email: string;
    first_name: string;
    last_name: string;
  };
  const enrolledSubjects =
    (app?.subjects as string[]) ?? (learner.subjects as string[]) ?? [];

  const confirmedLevels = parsedRows
    .filter((r) => r.tutoringName && r.subject.is_offered)
    .map((r) => ({
      subject: r.tutoringName!,
      level: r.level,
      band: r.band,
      percentage: r.percentage,
    }));

  if (applicationId && parent?.email && confirmedLevels.length > 0) {
    try {
      await allocateLearnerToClasses({
        learnerId,
        applicationId,
        grade,
        enrolledSubjects,
        confirmedLevels,
        parentEmail: parent.email,
        parentName: parent.first_name,
        learnerName: `${learner.first_name} ${learner.last_name}`,
      });
    } catch (err) {
      console.error('saveManualReport allocation:', err);
      allocationWarning =
        'Results were saved but class placement may need a follow-up from our team.';
    }
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

  const { data: app } = await service
    .from('applications')
    .select('id, subjects')
    .eq('learner_id', learner.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const applicationId = app?.id;
  const enrolledSubjects = (app?.subjects as string[]) ?? learner.subjects ?? [];

  const confirmedLevels = offeredRows
    .filter((r) => r.percentage != null)
    .map((r) => ({
      subject: r.subject_name_clean,
      level: percentageToLevel(r.percentage!),
      band: percentageToBand(r.percentage!) as ClassBand,
      percentage: r.percentage,
    }));

  const parent = learner.parents;
  if (applicationId && parent?.email) {
    await allocateLearnerToClasses({
      learnerId: learner.id,
      applicationId,
      grade: learner.grade,
      enrolledSubjects,
      confirmedLevels,
      parentEmail: parent.email,
      parentName: parent.first_name,
      learnerName: `${learner.first_name} ${learner.last_name}`,
    });
  }

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/reports/confirm/${reportId}`);
  return { ok: true };
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
