import Link from 'next/link';
import { format } from 'date-fns';
import { DeleteReportButton } from '@/app/components/dashboard/DeleteReportButton';
import type { ReportListItem } from '@/lib/parent-dashboard-sections';

function statusLabel(confirmed: boolean) {
  if (confirmed) return 'Saved';
  return 'Needs completion';
}

export function ReportCard({ report }: { report: ReportListItem }) {
  const needsAction = !report.confirmed;

  return (
    <div className='rounded-xl border border-border bg-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <p className='font-medium text-foreground'>
            {report.term} {report.academic_year}
          </p>
          <p className='text-xs text-muted-foreground'>
            Added {format(new Date(report.uploaded_at), 'd MMM yyyy')}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            report.confirmed
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-amber-50 text-amber-800'
          }`}
        >
          {statusLabel(report.confirmed)}
        </span>
      </div>

      {report.extractionCount > 0 ? (
        <p className='mt-2 text-xs text-muted-foreground'>
          {report.extractionCount} subject
          {report.extractionCount !== 1 ? 's' : ''} recorded
        </p>
      ) : null}

      <div className='mt-3 flex flex-wrap items-center gap-4'>
        <Link
          href={
            report.confirmed
              ? `/dashboard/reports/confirm/${report.id}?manual=true`
              : `/dashboard/reports/${report.learner.id}/add`
          }
          className='text-sm font-medium text-primary underline'
        >
          {needsAction ? 'Complete report →' : 'View results →'}
        </Link>
        <DeleteReportButton
          reportId={report.id}
          term={report.term}
          academicYear={report.academic_year}
          confirmed={report.confirmed}
          variant='card'
        />
      </div>
    </div>
  );
}
