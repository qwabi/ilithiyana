import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getTutorSession,
  getTutorTimesheetById,
} from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

export default async function TutorTimesheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getTutorSession();
  if (!session) return null;

  const timesheet = await getTutorTimesheetById(session.tutor.id, id);
  if (!timesheet) notFound();

  return (
    <div className='space-y-6'>
      <div>
        <Link
          href='/tutor/timesheets'
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Timesheets
        </Link>
        <h1 className={`${pageTitle} mt-2`}>{timesheet.month_period}</h1>
      </div>

      <Card className='max-w-md'>
        <CardHeader>
          <CardTitle className='text-base capitalize'>{timesheet.status}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 text-sm'>
          <p>
            <span className='text-muted-foreground'>Sessions:</span>{' '}
            {timesheet.sessions_count}
          </p>
          <p>
            <span className='text-muted-foreground'>Amount:</span> R
            {(timesheet.amount_cents / 100).toFixed(2)}
          </p>
          <p>
            <span className='text-muted-foreground'>Submitted:</span>{' '}
            {new Date(timesheet.created_at).toLocaleDateString('en-ZA')}
          </p>
          {timesheet.notes ? (
            <p>
              <span className='text-muted-foreground'>Notes:</span>{' '}
              {timesheet.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
