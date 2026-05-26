'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  TimesheetStatus,
  TutorTimesheetWithTutor,
} from '@/lib/types/database';
import {
  fetchTimesheets,
  setTimesheetStatus,
} from '@/app/actions/admin-actions';

function statusVariant(status: TimesheetStatus) {
  switch (status) {
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    default:
      return 'outline';
  }
}

interface Props {
  initialRows: TutorTimesheetWithTutor[];
  initialError?: string;
}

export function TimesheetsTable({ initialRows, initialError }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const result = await fetchTimesheets();
      setRows(result.data);
      setError(result.error ?? null);
    });
  };

  const updateStatus = async (id: string, status: TimesheetStatus) => {
    const result = await setTimesheetStatus(id, status);
    if (!result.ok) {
      toast.error(result.error ?? 'Update failed');
      return;
    }
    toast.success(`Timesheet ${status}`);
    refresh();
  };

  return (
    <div className='space-y-4'>
      {isPending && (
        <span className='text-sm text-muted-foreground'>Loading…</span>
      )}
      {error && <p className='text-sm text-destructive'>{error}</p>}

      <div className='grid gap-4'>
        {rows.map((row) => {
          const tutor = row.tutors;
          const name = tutor
            ? `${tutor.first_name} ${tutor.last_name}`
            : 'Unknown tutor';

          return (
            <Card key={row.id}>
              <CardHeader className='pb-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <CardTitle className='text-lg'>{name}</CardTitle>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <p>
                  <span className='text-muted-foreground'>Period:</span>{' '}
                  {row.month_period}
                </p>
                <p>
                  <span className='text-muted-foreground'>Sessions:</span>{' '}
                  {row.sessions_count} — R
                  {(row.amount_cents / 100).toFixed(2)}
                </p>
                <p className='text-muted-foreground'>
                  Submitted {format(new Date(row.created_at), 'd MMM yyyy')}
                </p>
                <Button variant='outline' size='sm' className='mt-2' asChild>
                  <Link href={`/admin/dashboard/timesheets/${row.id}`}>
                    View details
                  </Link>
                </Button>
                {row.status === 'submitted' && (
                  <div className='flex gap-2 pt-2'>
                    <Button size='sm' onClick={() => updateStatus(row.id, 'approved')}>
                      Approve
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => updateStatus(row.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {!rows.length && !error && (
          <p className='text-muted-foreground'>No timesheets submitted yet.</p>
        )}
      </div>
    </div>
  );
}
