'use client';

import { useEffect, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TutorRow } from '@/lib/types/database';
import {
  loginTutorPortal,
  logoutTutorPortal,
  submitTutorTimesheetAction,
} from '@/app/actions/portal-actions';
import { useRouter } from 'next/navigation';

interface Props {
  initialTutor: TutorRow | null;
}

const portalCard =
  'rounded-xl border-[0.5px] border-border bg-white shadow-sm';
const portalInput =
  'mt-1.5 h-11 rounded-lg border border-input bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0';
const cardTitle =
  '[font-family:var(--font-dm-serif),serif] text-xl font-normal tracking-tight';

export function TutorPortal({ initialTutor }: Props) {
  const [tutor, setTutor] = useState(initialTutor);

  useEffect(() => {
    setTutor(initialTutor);
  }, [initialTutor]);
  const [email, setEmail] = useState('');
  const [monthPeriod, setMonthPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [sessionsCount, setSessionsCount] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogin = () => {
    startTransition(async () => {
      const result = await loginTutorPortal(email);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Signed in');
      router.refresh();
    });
  };

  const handleLogout = async () => {
    await logoutTutorPortal();
    setTutor(null);
    router.refresh();
  };

  const handleSubmit = () => {
    const count = Number(sessionsCount);
    if (!monthPeriod || count < 1) {
      toast.error('Enter month and session count');
      return;
    }

    startTransition(async () => {
      const result = await submitTutorTimesheetAction({
        monthPeriod,
        sessionsCount: count,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Timesheet submitted for admin review');
      setSessionsCount('');
    });
  };

  if (!tutor) {
    return (
      <Card className={portalCard}>
        <CardHeader>
          <CardTitle className={cardTitle}>Tutor sign in</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <Label htmlFor='tutorEmail' className='text-sm font-medium'>
              Work email
            </Label>
            <Input
              id='tutorEmail'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@ilithiyana.co.za'
              className={portalInput}
            />
          </div>
          <Button
            onClick={handleLogin}
            disabled={isPending || !email}
            variant='secondary'
            className='h-11 w-full font-semibold'
          >
            {isPending ? 'Checking…' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const estimated = tutor.session_rate_cents * (Number(sessionsCount) || 0);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-sm text-muted-foreground'>
          Signed in as {tutor.first_name} {tutor.last_name}
        </p>
        <Button variant='ghost' size='sm' onClick={handleLogout}>
          Sign out
        </Button>
      </div>

      <Card className={portalCard}>
        <CardHeader>
          <CardTitle className={cardTitle}>Submit timesheet</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            Rate: R{(tutor.session_rate_cents / 100).toFixed(2)} per session
          </p>
          <div>
            <Label htmlFor='month' className='text-sm font-medium'>
              Month (YYYY-MM)
            </Label>
            <Input
              id='month'
              type='month'
              value={monthPeriod}
              onChange={(e) => setMonthPeriod(e.target.value)}
              className={portalInput}
            />
          </div>
          <div>
            <Label htmlFor='sessions' className='text-sm font-medium'>
              Sessions delivered
            </Label>
            <Input
              id='sessions'
              type='number'
              min={1}
              value={sessionsCount}
              onChange={(e) => setSessionsCount(e.target.value)}
              className={portalInput}
            />
          </div>
          {sessionsCount ? (
            <p className='text-sm text-foreground'>
              Estimated amount:{' '}
              <span className='font-medium'>
                R{(estimated / 100).toFixed(2)}
              </span>
            </p>
          ) : null}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            variant='secondary'
            className='h-11 w-full font-semibold sm:w-auto sm:px-8'
          >
            {isPending ? 'Submitting…' : 'Submit for approval'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
