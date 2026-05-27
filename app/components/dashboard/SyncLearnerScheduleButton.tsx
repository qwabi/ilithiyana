'use client';

import { useTransition } from 'react';
import { Loader2, CalendarPlus } from 'lucide-react';
import { syncLearnerClassesAndSchedule } from '@/app/actions/learner-placement-actions';
import toast from 'react-hot-toast';

export function SyncLearnerScheduleButton({
  learnerId,
  learnerName,
}: {
  learnerId: string;
  learnerName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type='button'
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await syncLearnerClassesAndSchedule(learnerId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(
            result.sessionsCreated > 0
              ? `Schedule ready for ${learnerName} (${result.sessionsCreated} class${result.sessionsCreated === 1 ? '' : 'es'})`
              : result.message
          );
        });
      }}
      className='inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-[hsl(210,100%,98%)] px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-[hsl(210,100%,94%)] disabled:opacity-50'
    >
      {pending ? (
        <Loader2 size={14} className='animate-spin' />
      ) : (
        <CalendarPlus size={14} />
      )}
      Set up classes & schedule
    </button>
  );
}
