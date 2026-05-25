import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { reportId: string } }
) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const reportId = params.reportId;

  const { data: report, error } = await supabase
    .from('learner_reports')
    .select('id, ocr_status, confirmed, learner_id')
    .eq('id', reportId)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('report_extractions')
    .select('id', { count: 'exact', head: true })
    .eq('report_id', reportId);

  return NextResponse.json({
    reportId: report.id,
    ocrStatus: report.ocr_status,
    confirmed: report.confirmed,
    extractionCount: count ?? 0,
    ready:
      report.ocr_status === 'complete' ||
      report.ocr_status === 'failed',
    confirmUrl: `/dashboard/reports/confirm/${reportId}`,
  });
}
