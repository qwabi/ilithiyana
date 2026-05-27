'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { updateApplicationStatus } from '@/app/actions/admin-actions';
import type { ApplicationStatus } from '@/lib/types/database';

export function ApplicationDetailActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (next: 'approved' | 'rejected') => {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, next);
      if (!result.ok) {
        toast.error(result.error ?? 'Update failed');
        return;
      }
      toast.success(`Application ${next}`);
      router.refresh();
    });
  };

  if (status !== 'pending') {
    return (
      <span className='text-sm font-medium capitalize text-muted-foreground'>
        Status: {status}
      </span>
    );
  }

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
