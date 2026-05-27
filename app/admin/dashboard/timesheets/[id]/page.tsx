import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { fetchTimesheetById } from '@/app/actions/admin-actions';
import { TimesheetReviewActions } from '@/app/components/admin/TimesheetReviewActions';

type Props = { params: Promise<{ id: string }> };

export default async function TimesheetDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: row, error } = await fetchTimesheetById(id);

  if (error) {
    return (
      <AdminShell title='Timesheet' backHref='/admin/dashboard/timesheets'>
        <p className='text-sm text-destructive'>{error}</p>
      </AdminShell>
    );
  }

  if (!row) notFound();

  const tutor = row.tutors;
  const sessions = row.timesheet_sessions ?? [];

  return (
    <AdminShell
      title={
        tutor
          ? `${tutor.first_name} ${tutor.last_name}`
          : 'Timesheet'
      }
      description={`Period ${row.month_period}`}
      backHref='/admin/dashboard/timesheets'
      backLabel='All timesheets'
      actions={
        row.status === 'submitted' ? (
          <TimesheetReviewActions timesheetId={row.id} />
        ) : (
          <Badge variant='outline' className='capitalize'>
            {row.status}
          </Badge>
        )
      }
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Summary</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            <p>Sessions: {row.sessions_count}</p>
            <p>Amount: R {(row.amount_cents / 100).toFixed(2)}</p>
            <p className='text-muted-foreground'>
              Submitted {format(new Date(row.created_at), 'd MMM yyyy HH:mm')}
            </p>
            {tutor ? (
              <Link
                href={`/admin/dashboard/tutors/${tutor.id}`}
                className='text-primary hover:underline'
              >
                View tutor
              </Link>
            ) : null}
            {row.notes ? (
              <p className='pt-2 text-muted-foreground'>Notes: {row.notes}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>
              Session lines ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {sessions.length === 0 ? (
              <p className='text-muted-foreground'>No line items recorded</p>
            ) : (
              sessions.map((s) => (
                <p key={s.id}>
                  {format(new Date(s.session_date), 'd MMM yyyy')}
                  {s.subject ? ` · ${s.subject}` : ''} · {s.duration_minutes} min
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
