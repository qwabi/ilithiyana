import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TutorDashboardStatCards } from '@/app/tutor/_components/TutorDashboardStatCards';
import { getTutorSession, getTutorClasses, getTutorTimesheets } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

export default async function TutorDashboardPage() {
  const session = await getTutorSession();
  if (!session) return null;

  const [classes, timesheets] = await Promise.all([
    getTutorClasses(session.tutor.id).catch(() => []),
    getTutorTimesheets(session.tutor.id).catch(() => []),
  ]);

  const pendingTimesheets = timesheets.filter((t) => t.status === 'submitted');
  const recentTimesheet = timesheets[0];

  return (
    <div className='space-y-8'>
      <div>
        <h1 className={pageTitle}>Dashboard</h1>
        <p className='mt-2 text-muted-foreground'>
          Welcome back, {session.tutor.first_name}.
        </p>
      </div>

      <TutorDashboardStatCards
        stats={[
          { label: 'Active classes', value: String(classes.length) },
          {
            label: 'Timesheets pending review',
            value: String(pendingTimesheets.length),
          },
          {
            label: 'Session rate',
            value: `R${(session.tutor.session_rate_cents / 100).toFixed(0)}`,
          },
        ]}
      />

      <div className='flex flex-wrap gap-3'>
        <Button asChild>
          <Link href='/tutor/timesheets/new'>Submit timesheet</Link>
        </Button>
        <Button asChild variant='outline'>
          <Link href='/tutor/schedule'>View schedule</Link>
        </Button>
      </div>

      {recentTimesheet ? (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Latest timesheet</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            <p>
              {recentTimesheet.month_period} · {recentTimesheet.sessions_count}{' '}
              sessions ·{' '}
              <span className='capitalize'>{recentTimesheet.status}</span>
            </p>
            <Button asChild variant='link' className='mt-2 h-auto p-0'>
              <Link href={`/tutor/timesheets/${recentTimesheet.id}`}>View</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
