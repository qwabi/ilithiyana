'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteLearnerReport } from '@/app/actions/report-actions';
import { Button } from '@/components/ui/button';

type Props = {
  reportId: string;
  term: string;
  academicYear: number;
  confirmed: boolean;
  /** Called after a successful delete (e.g. redirect away from confirm page). */
  onDeleted?: () => void;
  variant?: 'list' | 'card';
};

export function DeleteReportButton({
  reportId,
  term,
  academicYear,
  confirmed,
  onDeleted,
  variant = 'list',
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const label = `${term} ${academicYear}`;
    const message = confirmed
      ? `Delete the ${label} report? This removes class placements and upcoming lessons linked to this report.`
      : `Delete the draft ${label} report?`;

    if (!window.confirm(message)) return;

    setError(null);
    setPending(true);
    try {
      const result = await deleteLearnerReport(reportId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted?.();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={variant === 'card' ? 'mt-3' : undefined}>
      {error ? (
        <p className='mb-2 text-xs text-destructive' role='alert'>
          {error}
        </p>
      ) : null}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className={
          variant === 'card'
            ? 'h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive'
            : 'h-8 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive'
        }
        disabled={pending}
        onClick={() => void handleDelete()}
      >
        <Trash2 className='h-3.5 w-3.5' aria-hidden />
        {pending ? 'Deleting…' : 'Delete report'}
      </Button>
    </div>
  );
}
