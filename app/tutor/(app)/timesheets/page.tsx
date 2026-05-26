import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getTutorSession, getTutorTimesheets } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default async function TutorTimesheetsPage() {
  const session = await getTutorSession();
  if (!session) return null;

  const timesheets = await getTutorTimesheets(session.tutor.id).catch(() => []);

  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className={pageTitle}>Timesheets</h1>
          <p className='mt-2 text-muted-foreground'>
            Submit monthly session logs for payroll approval.
          </p>
        </div>
        <Button asChild>
          <Link href='/tutor/timesheets/new'>New timesheet</Link>
        </Button>
      </div>

      {timesheets.length === 0 ? (
        <Card>
          <CardContent className='py-10 text-center text-sm text-muted-foreground'>
            No timesheets yet. Submit your first monthly log when you have
            delivered sessions.
          </CardContent>
        </Card>
      ) : (
        <ul className='divide-y divide-border rounded-xl border border-border bg-card'>
          {timesheets.map((row) => (
            <li key={row.id}>
              <Link
                href={`/tutor/timesheets/${row.id}`}
                className='flex flex-wrap items-center justify-between gap-2 px-4 py-4 hover:bg-muted/50'
              >
                <div>
                  <p className='font-medium'>{row.month_period}</p>
                  <p className='text-sm text-muted-foreground'>
                    {row.sessions_count} sessions · R
                    {(row.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    statusStyles[row.status] ?? statusStyles.submitted
                  }`}
                >
                  {row.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
