'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitTutorTimesheetAction } from '@/lib/tutor/actions';

export function TimesheetSubmitForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [monthPeriod, setMonthPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [sessionsCount, setSessionsCount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(sessionsCount);
    if (!monthPeriod || count < 1) {
      toast.error('Enter month and session count');
      return;
    }
    startTransition(async () => {
      const result = await submitTutorTimesheetAction({
        monthPeriod,
        sessionsCount: count,
        notes: notes || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Timesheet submitted for review');
      router.refresh();
      setSessionsCount('');
      setNotes('');
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm'>
      <h2 className='text-lg font-semibold text-[#0F2942]'>Submit timesheet</h2>
      <div>
        <Label htmlFor='month'>Month (YYYY-MM)</Label>
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
        <Input
          id='notes'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className='mt-1'
        />
      </div>
      <Button
        type='submit'
        disabled={pending}
        className='rounded-full bg-[#1B6CA8] hover:bg-[#1B6CA8]/90'
      >
        {pending ? 'Submitting…' : 'Submit for approval'}
      </Button>
    </form>
  );
}
