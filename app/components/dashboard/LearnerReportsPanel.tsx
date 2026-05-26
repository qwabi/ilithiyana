'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export type ReportHistoryRow = {
  id: string;
  term: string;
  academic_year: number;
  uploaded_at: string;
  confirmed: boolean;
};

export function LearnerReportsPanel({
  learnerId,
  learnerName,
  reports,
}: {
  learnerId: string;
  learnerName: string;
  reports: ReportHistoryRow[];
}) {
  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-lg font-semibold text-[hsl(210,100%,25%)]'>
          Reports for {learnerName}
        </h2>
        <p className='text-sm text-muted-foreground'>
          Add a new report at the end of each term to update levels and class
          placement.
        </p>
        <div className='mt-3'>
          <Button asChild variant='default' className='rounded-full'>
            <Link href={`/dashboard/reports/${learnerId}/add`}>
              Add report
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h3 className='mb-3 font-medium'>History</h3>
        {reports.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No reports added yet.</p>
        ) : (
          <ul className='divide-y rounded-lg border bg-white'>
            {reports.map((r) => (
              <li
                key={r.id}
                className='flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm'
              >
                <div>
                  <span className='font-medium'>
                    {r.term} {r.academic_year}
                  </span>
                  <span className='ml-2 text-muted-foreground'>
                    {new Date(r.uploaded_at).toLocaleDateString('en-ZA')}
                  </span>
                  <span className='ml-2 rounded-full bg-muted px-2 py-0.5 text-xs'>
                    {r.confirmed ? 'Saved' : 'Draft'}
                  </span>
                </div>
                <Link
                  href={
                    r.confirmed
                      ? `/dashboard/reports/confirm/${r.id}?manual=true`
                      : `/dashboard/reports/${learnerId}/add`
                  }
                  className='text-primary underline-offset-4 hover:underline'
                >
                  {r.confirmed ? 'View results' : 'Complete report'}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
