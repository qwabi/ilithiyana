import Link from 'next/link';
import { format } from 'date-fns';
import type { ReportListItem } from '@/lib/parent-dashboard-sections';

function ocrLabel(status: string, confirmed: boolean) {
  if (confirmed) return 'Confirmed';
  if (status === 'complete') return 'Ready to review';
  if (status === 'processing' || status === 'pending') return 'Scanning…';
  if (status === 'failed') return 'Needs manual entry';
  return status;
}

export function ReportCard({ report }: { report: ReportListItem }) {
  const needsConfirm =
    !report.confirmed &&
    (report.ocr_status === 'complete' || report.ocr_status === 'failed');

  return (
    <div className='rounded-xl border border-border bg-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <p className='font-medium text-foreground'>
            {report.term} {report.academic_year}
          </p>
          <p className='text-xs text-muted-foreground'>
            Uploaded {format(new Date(report.uploaded_at), 'd MMM yyyy')}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            report.confirmed
              ? 'bg-emerald-50 text-emerald-800'
              : needsConfirm
                ? 'bg-amber-50 text-amber-800'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {ocrLabel(report.ocr_status, report.confirmed)}
        </span>
      </div>

      {report.extractionCount > 0 ? (
        <p className='mt-2 text-xs text-muted-foreground'>
          {report.extractionCount} subject
          {report.extractionCount !== 1 ? 's' : ''} extracted
          {report.needsReviewCount > 0
            ? ` · ${report.needsReviewCount} need review`
            : ''}
        </p>
      ) : null}

      {needsConfirm ? (
        <Link
          href={`/dashboard/reports/confirm/${report.id}`}
          className='mt-3 inline-block text-sm font-medium text-primary underline'
        >
          Review results →
        </Link>
      ) : null}
    </div>
  );
}
