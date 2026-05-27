import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { nscDescriptor } from '@/lib/curriculum/subjects';

export type ManualSummaryExtraction = {
  id: string;
  subject_name_clean: string | null;
  percentage: number | null;
  level: number | null;
  band: string | null;
};

export function ManualReportSummary({
  learnerName,
  term,
  academicYear,
  learnerId,
  extractions,
  allocationWarning,
}: {
  learnerName: string;
  term: string;
  academicYear: number;
  learnerId: string;
  extractions: ManualSummaryExtraction[];
  allocationWarning?: string | null;
}) {
  return (
    <div className='mx-auto max-w-lg text-center'>
      <div
        className='mx-auto mb-4 flex h-14 w-14 items-center justify-center
                   rounded-full bg-emerald-100'
      >
        <CheckCircle className='text-emerald-600' size={28} />
      </div>

      <h1 className='[font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)]'>
        Results saved
      </h1>
      <p className='mt-1 text-sm text-muted-foreground'>
        {learnerName}&apos;s results for {term} {academicYear} have been saved
        and class placement has been updated.
      </p>

      {allocationWarning ? (
        <p className='mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          {allocationWarning}
        </p>
      ) : null}

      <div className='mb-6 mt-6 overflow-hidden rounded-xl border border-border bg-white text-left'>
        <div className='border-b border-border bg-muted/30 px-4 py-2.5'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Saved results
          </p>
        </div>
        <div className='divide-y divide-border'>
          {extractions.map((e) => (
            <div
              key={e.id}
              className='flex items-center justify-between gap-4 px-4 py-3'
            >
              <div>
                <p className='text-sm font-medium text-foreground'>
                  {e.subject_name_clean}
                </p>
                {e.level != null ? (
                  <p className='text-xs text-muted-foreground'>
                    {nscDescriptor(e.level)}
                  </p>
                ) : null}
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-semibold text-foreground'>
                  {e.percentage}%
                </span>
                {e.level != null && e.band ? (
                  <span
                    className='rounded-full bg-[hsl(210,100%,96%)] px-2 py-0.5
                               text-xs font-bold text-[hsl(210,100%,35%)]'
                  >
                    L{e.level} · {e.band}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='flex gap-3'>
        <Link
          href='/dashboard/schedules'
          className='flex-1 rounded-full bg-accent py-2.5 text-center text-sm font-bold
                     text-[hsl(210,100%,12%)] transition-colors hover:bg-accent/90'
        >
          View schedule →
        </Link>
        <Link
          href={`/dashboard/reports/${learnerId}`}
          className='flex-1 rounded-full border border-border py-2.5 text-center
                     text-sm font-medium text-muted-foreground transition-colors
                     hover:bg-muted/50'
        >
          All reports
        </Link>
      </div>
    </div>
  );
}
