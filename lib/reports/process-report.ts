import { createServiceClient } from '@/lib/supabase/server';
import {
  APPLICATION_DOCUMENTS_BUCKET,
  createApplicationDocumentSignedUrl,
} from '@/lib/supabase/storage';
import { extractSubjectsFromOcrText } from '@/lib/reports/extract';
import { runOcrOnBuffer, type OcrFileType } from '@/lib/reports/ocr';
import { percentageToBand, percentageToLevel } from '@/lib/reports/nsc';
import { sendEmail } from '@/lib/email';
import { reportOcrCompleteEmail } from '@/lib/email/templates';
import { brand } from '@/lib/site-config';

export async function processLearnerReport(reportId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: report, error: fetchErr } = await supabase
    .from('learner_reports')
    .select('*, learners(id, first_name, last_name, parent_id, parents(email, first_name))')
    .eq('id', reportId)
    .single();

  if (fetchErr || !report) {
    throw new Error(fetchErr?.message ?? 'Report not found');
  }

  if (report.file_type === 'manual') return;
  if (report.ocr_status === 'complete') return;

  await supabase
    .from('learner_reports')
    .update({ ocr_status: 'processing' })
    .eq('id', reportId);

  const storagePath = report.file_url as string;
  let ocrText = '';
  let ocrStatus: 'complete' | 'failed' = 'complete';

  try {
    const { data: fileData, error: dlErr } = await supabase.storage
      .from(APPLICATION_DOCUMENTS_BUCKET)
      .download(storagePath);

    if (dlErr || !fileData) {
      throw new Error(dlErr?.message ?? 'Could not download report file');
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const fileType = (report.file_type as OcrFileType) || 'jpg';
    ocrText = await runOcrOnBuffer(buffer, fileType);
  } catch (e) {
    console.error('OCR failed for report', reportId, e);
    ocrStatus = 'failed';
    ocrText = '';
  }

  await supabase
    .from('learner_reports')
    .update({
      ocr_status: ocrStatus,
      ocr_raw_text: ocrText || null,
      ocr_completed_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  await supabase.from('report_extractions').delete().eq('report_id', reportId);

  let rows =
    ocrStatus === 'complete' && ocrText
      ? await extractSubjectsFromOcrText(ocrText)
      : [];

  if (rows.length === 0 && ocrStatus === 'failed') {
    rows = [];
  }

  if (rows.length > 0) {
    const inserts = rows.map((r) => ({
      report_id: reportId,
      subject_name_raw: r.subject_name_raw,
      subject_name_clean: r.subject_name_clean,
      percentage: r.percentage,
      level: r.level,
      band: r.band ?? (r.percentage != null ? percentageToBand(r.percentage) : null),
      term: r.term ?? report.term,
      confidence: r.confidence,
      needs_review: r.needs_review,
      is_offered: r.is_offered,
    }));

    await supabase.from('report_extractions').insert(inserts);
  }

  const learner = report.learners as {
    first_name: string;
    last_name: string;
    parents: { email: string; first_name: string } | null;
  } | null;

  const parentEmail = learner?.parents?.email;
  if (parentEmail) {
    const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;
    const confirmUrl = `${site}/dashboard/reports/confirm/${reportId}`;
    const tpl = reportOcrCompleteEmail({
      parentName: learner.parents?.first_name ?? 'Parent',
      learnerName: `${learner.first_name} ${learner.last_name}`,
      confirmUrl,
      ocrFailed: ocrStatus === 'failed',
    });
    await sendEmail({
      to: parentEmail,
      subject: tpl.subject,
      html: tpl.html,
    }).catch(console.error);
  }

  await supabase
    .from('applications')
    .update({ allocation_status: 'pending_confirmation' })
    .eq('learner_id', report.learner_id);

  await supabase
    .from('learners')
    .update({ allocation_status: 'pending_confirmation' })
    .eq('id', report.learner_id);
}

export async function createReportFromLeadStorage(opts: {
  learnerId: string;
  applicationId: string;
  storagePath: string;
  uploadedByProfileId?: string | null;
  term?: string;
  academicYear?: number;
}): Promise<string> {
  const supabase = createServiceClient();
  const ext = opts.storagePath.split('.').pop()?.toLowerCase() ?? 'pdf';
  const fileType =
    ext === 'pdf'
      ? 'pdf'
      : ext === 'png'
        ? 'png'
        : ext === 'webp'
          ? 'webp'
          : 'jpg';

  const { data, error } = await supabase
    .from('learner_reports')
    .insert({
      learner_id: opts.learnerId,
      application_id: opts.applicationId,
      uploaded_by: opts.uploadedByProfileId ?? null,
      file_url: opts.storagePath,
      file_type: fileType,
      term: opts.term ?? 'Year End',
      academic_year: opts.academicYear ?? new Date().getFullYear(),
      ocr_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create learner_reports row');
  }

  return data.id as string;
}

export function enrichExtractionPercentages(
  percentage: number | null,
  level: number | null
): { level: number | null; band: string | null } {
  if (percentage == null) return { level, band: level != null ? percentageToBand(level * 14) : null };
  const lvl = percentageToLevel(percentage);
  return { level: lvl, band: percentageToBand(percentage) };
}

export async function getReportFileSignedUrl(storagePath: string): Promise<string | null> {
  return createApplicationDocumentSignedUrl(storagePath, 3600);
}
