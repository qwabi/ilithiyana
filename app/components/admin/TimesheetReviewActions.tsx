'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { setTimesheetStatus } from '@/app/actions/admin-actions';

export function TimesheetReviewActions({ timesheetId }: { timesheetId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (status: 'approved' | 'rejected') => {
    startTransition(async () => {
      const result = await setTimesheetStatus(timesheetId, status);
      if (!result.ok) {
        toast.error(result.error ?? 'Update failed');
        return;
      }
      toast.success(`Timesheet ${status}`);
      router.refresh();
    });
  };

  return (
    <div className='flex gap-2'>
      <Button size='sm' disabled={isPending} onClick={() => run('approved')}>
        Approve
      </Button>
      <Button
        size='sm'
        variant='destructive'
        disabled={isPending}
        onClick={() => run('rejected')}
      >
        Reject
      </Button>
    </div>
  );
}
