import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ReportConfirmForm } from '@/app/components/dashboard/ReportConfirmForm';
import { ManualReportSummary } from '@/app/components/dashboard/ManualReportSummary';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';

const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: ['400'] });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500'] });

export const dynamic = 'force-dynamic';

export default async function ReportConfirmPage({
  params,
  searchParams,
}: {
  params: { report_id: string };
  searchParams?: { manual?: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?from=/dashboard/reports/confirm/${params.report_id}`);

  const { data: report } = await supabase
    .from('learner_reports')
    .select(
      `
      id, ocr_status, confirmed, term, academic_year, file_type,
      learners ( id, first_name, last_name, parent_id, parents ( profile_id ) )
    `
    )
    .eq('id', params.report_id)
    .single();

  if (!report) {
    return (
      <p className='text-muted-foreground'>
        Report not found.{' '}
        <Link href='/dashboard/reports' className='underline'>
          Back to reports
        </Link>
      </p>
    );
  }

  const learner = report.learners as {
    id: string;
    first_name: string;
    last_name: string;
    parents: { profile_id: string | null } | null;
  };

  if (learner.parents?.profile_id !== user.id) {
    redirect('/dashboard');
  }

  const isManualView =
    searchParams?.manual === 'true' || report.file_type === 'manual';

  const { data: extractions } = await supabase
    .from('report_extractions')
    .select('*')
    .eq('report_id', params.report_id)
    .order('subject_name_clean');

  const learnerName = `${learner.first_name} ${learner.last_name}`;

  if (report.confirmed && isManualView) {
    return (
      <div className={jakarta.className}>
        <Link
          href='/dashboard/reports'
          className='text-sm text-muted-foreground hover:underline'
        >
          ← Reports
        </Link>
        <div className='mt-6'>
          <ManualReportSummary
            learnerName={learnerName}
            term={report.term}
            academicYear={report.academic_year}
            learnerId={learner.id}
            extractions={(extractions ?? []).map((e) => ({
              id: e.id,
              subject_name_clean: e.subject_name_clean,
              percentage: e.percentage != null ? Number(e.percentage) : null,
              level: e.level,
              band: e.band,
            }))}
          />
        </div>
      </div>
    );
  }

  if (report.confirmed) {
    redirect('/dashboard/reports');
  }

  const ocrFailed = report.ocr_status === 'failed';

  return (
    <div className={`max-w-3xl ${jakarta.className}`}>
      <Link href='/dashboard/reports' className='text-sm text-muted-foreground hover:underline'>
        ← Reports
      </Link>
      <h1
        className={`${dmSerif.className} mt-4 text-3xl text-[hsl(210,100%,25%)]`}
      >
        Please confirm {learnerName}&apos;s results
      </h1>
      <p className='mt-2 text-muted-foreground'>
        We extracted these results from the uploaded report ({report.term}{' '}
        {report.academic_year}). Check each subject, correct any errors, and
        confirm.
      </p>

      {report.ocr_status === 'processing' || report.ocr_status === 'pending' ? (
        <p className='mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm'>
          We are still reading your report. Refresh this page in a moment, or
          check your email for a confirmation link.
        </p>
      ) : (
        <div className='mt-8'>
          <ReportConfirmForm
            learnerName={learnerName}
            reportId={params.report_id}
            ocrFailed={ocrFailed}
            initialRows={(extractions ?? []).map((e) => ({
              id: e.id,
              subject_name_raw: e.subject_name_raw,
              subject_name_clean: e.subject_name_clean ?? e.subject_name_raw,
              percentage: e.percentage != null ? Number(e.percentage) : null,
              level: e.level,
              band: e.band,
              needs_review: e.needs_review,
              is_offered: e.is_offered,
            }))}
          />
        </div>
      )}
    </div>
  );
}
