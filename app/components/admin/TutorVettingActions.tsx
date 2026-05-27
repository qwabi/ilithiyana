'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { setTutorVettingStatus } from '@/app/actions/admin-actions';
import type { TutorVettingStatus } from '@/lib/types/database';

export function TutorVettingActions({
  tutorId,
  currentStatus,
}: {
  tutorId: string;
  currentStatus: TutorVettingStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (status: 'approved' | 'rejected') => {
    startTransition(async () => {
      const result = await setTutorVettingStatus(tutorId, status);
      if (!result.ok) {
        toast.error(result.error ?? 'Update failed');
        return;
      }
      toast.success(`Tutor ${status}`);
      router.refresh();
    });
  };

  if (
    currentStatus === 'approved' ||
    currentStatus === 'rejected' ||
    currentStatus === 'suspended'
  ) {
    return (
      <p className='text-sm text-muted-foreground capitalize'>
        Vetting: {currentStatus}
      </p>
    );
  }

  return (
    <div className='flex flex-wrap gap-2'>
      <Button size='sm' disabled={isPending} onClick={() => run('approved')}>
        Approve vetting
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
