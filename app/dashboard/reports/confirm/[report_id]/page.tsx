import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLearnerForParentUser } from '@/lib/parent-learner-access';
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
  params: Promise<{ report_id: string }>;
  searchParams?: Promise<{ manual?: string }>;
}) {
  const { report_id } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?from=/dashboard/reports/confirm/${report_id}`);

  const { data: report } = await supabase
    .from('learner_reports')
    .select(
      `
      id, ocr_status, confirmed, term, academic_year, file_type,
      learner_id,
      learners ( id, first_name, last_name, parent_id )
    `
    )
    .eq('id', report_id)
    .maybeSingle();

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

  const learnerRow = report.learners as {
    id: string;
    first_name: string;
    last_name: string;
    parent_id: string;
  } | null;

  if (!learnerRow) {
    redirect('/dashboard/reports');
  }

  const access = await getLearnerForParentUser(user.id, learnerRow.id);
  if (!access) {
    redirect('/dashboard');
  }

  const isManualView =
    resolvedSearch?.manual === 'true' || report.file_type === 'manual';

  const { data: extractions } = await supabase
    .from('report_extractions')
    .select('*')
    .eq('report_id', report_id)
    .order('subject_name_clean');

  const learnerName = `${learnerRow.first_name} ${learnerRow.last_name}`;

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
            learnerId={learnerRow.id}
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

  const isLegacyFileReport = report.file_type !== 'manual';
  const awaitingScan =
    isLegacyFileReport &&
    (report.ocr_status === 'processing' || report.ocr_status === 'pending');

  if (awaitingScan) {
    return (
      <div className={`max-w-lg ${jakarta.className}`}>
        <Link
          href={`/dashboard/reports/${learnerRow.id}`}
          className='text-sm text-muted-foreground hover:underline'
        >
          ← Back to reports
        </Link>
        <h1
          className={`${dmSerif.className} mt-4 text-2xl text-[hsl(210,100%,25%)]`}
        >
          Enter report results
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          File uploads are no longer used. Please enter {learnerName}&apos;s marks
          using the report builder.
        </p>
        <Link
          href={`/dashboard/reports/${learnerRow.id}/add`}
          className='mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-[hsl(210,100%,12%)] hover:bg-accent/90'
        >
          Open report builder
        </Link>
      </div>
    );
  }

  const ocrFailed = report.ocr_status === 'failed';

  return (
    <div className={`max-w-3xl ${jakarta.className}`}>
      <Link href='/dashboard/reports' className='text-sm text-muted-foreground hover:underline'>
        ← Reports
      </Link>
      <h1 className={`${dmSerif.className} mt-4 text-3xl text-[hsl(210,100%,25%)]`}>
        Please confirm {learnerName}&apos;s results
      </h1>
      <p className='mt-2 text-muted-foreground'>
        Check each subject, correct any errors, and confirm ({report.term}{' '}
        {report.academic_year}).
      </p>

      <div className='mt-8'>
        <ReportConfirmForm
          learnerName={learnerName}
          reportId={report_id}
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
    </div>
  );
}
