'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitTutorTimesheetAction } from '@/lib/tutor/actions';
import type { TutorRow } from '@/lib/types/database';

export function TutorTimesheetForm({ tutor }: { tutor: TutorRow }) {
  const router = useRouter();
  const [monthPeriod, setMonthPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [sessionsCount, setSessionsCount] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();

  const count = Number(sessionsCount) || 0;
  const estimated = tutor.session_rate_cents * count;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await submitTutorTimesheetAction({
        monthPeriod,
        sessionsCount: count,
        notes: notes.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Timesheet submitted');
      router.push(`/tutor/timesheets/${result.id}`);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='max-w-md space-y-4 rounded-xl border border-border bg-card p-6'
    >
      <p className='text-sm text-muted-foreground'>
        Rate: R{(tutor.session_rate_cents / 100).toFixed(2)} per session
      </p>
      <div>
        <Label htmlFor='month'>Month</Label>
        <Input
          id='month'
          type='month'
          value={monthPeriod}
          onChange={(e) => setMonthPeriod(e.target.value)}
          required
          className='mt-1'
        />
      </div>
      <div>
        <Label htmlFor='sessions'>Sessions delivered</Label>
        <Input
          id='sessions'
          type='number'
          min={1}
          value={sessionsCount}
          onChange={(e) => setSessionsCount(e.target.value)}
          required
          className='mt-1'
        />
      </div>
      <div>
        <Label htmlFor='notes'>Notes (optional)</Label>
        <Textarea
          id='notes'
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className='mt-1'
        />
      </div>
      {count > 0 ? (
        <p className='text-sm'>
          Estimated payout:{' '}
          <span className='font-semibold'>R{(estimated / 100).toFixed(2)}</span>
        </p>
      ) : null}
      <Button type='submit' disabled={pending || count < 1}>
        {pending ? 'Submitting…' : 'Submit for approval'}
      </Button>
    </form>
  );
}
