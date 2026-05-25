'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signInWithPassword } from '@/app/actions/auth-actions';
import { contact } from '@/lib/site-config';

const STORAGE_KEY = 'ilithiyana_enrollment_auth';

type Props = {
  fulfillOk: boolean;
  fulfillError: string | null;
  alreadyPaid: boolean;
  dashboardHref: string;
  alreadySignedIn: boolean;
};

export function PaymentReturnFulfill({
  fulfillOk,
  fulfillError,
  alreadyPaid,
  dashboardHref,
  alreadySignedIn,
}: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'signing_in' | 'done'>('idle');
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!fulfillOk) return;

    if (alreadySignedIn) {
      setPhase('done');
      router.replace('/dashboard');
      router.refresh();
      return;
    }

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    let creds: { email?: string; password?: string };
    try {
      creds = JSON.parse(raw) as { email?: string; password?: string };
    } catch {
      return;
    }

    if (!creds.email || !creds.password) return;

    setPhase('signing_in');
    startTransition(async () => {
      const result = await signInWithPassword(creds.email!, creds.password!);
      if (result.ok) {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setPhase('done');
        router.replace('/dashboard');
        router.refresh();
      } else {
        setPhase('idle');
      }
    });
  }, [fulfillOk, alreadySignedIn, router]);

  if (!fulfillOk) {
    return (
      <div className='mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
        <p className='flex items-start gap-2'>
          <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
          <span>
            We could not complete enrolment setup. Please contact{' '}
            <a href={`mailto:${contact.email}`} className='underline'>
              {contact.email}
            </a>{' '}
            with your payment reference.
            {fulfillError ? (
              <span className='mt-2 block font-mono text-xs opacity-80'>
                {fulfillError}
              </span>
            ) : null}
          </span>
        </p>
      </div>
    );
  }

  if (alreadyPaid) {
    return (
      <p className='mt-4 text-center text-xs text-muted-foreground'>
        Your enrolment was already recorded.
      </p>
    );
  }

  if (phase === 'signing_in') {
    return (
      <p className='mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
        Signing you in…
      </p>
    );
  }

  if (phase === 'done') {
    return (
      <p className='mt-4 text-center text-sm text-muted-foreground'>
        Redirecting to your dashboard…
      </p>
    );
  }

  return (
    <div className='mt-8'>
      <Button asChild className='w-full rounded-full' size='lg'>
        <Link href={dashboardHref}>Go to my dashboard →</Link>
      </Button>
      {!alreadySignedIn && (
        <p className='mt-3 text-center text-xs text-muted-foreground'>
          Sign in with the email and password you used on the application form.
        </p>
      )}
    </div>
  );
}
