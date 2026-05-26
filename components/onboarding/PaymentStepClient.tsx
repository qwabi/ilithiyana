'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { PayFastRedirectForm } from '@/app/components/PayFastRedirectForm';
import { initiateOnboardingPayment } from '@/app/actions/onboarding-actions';
import type { OnboardingSessionRow } from '@/lib/onboarding/sessions';
import { LOCAL_STORAGE_SESSION_KEY } from '@/lib/onboarding/constants';
import toast from 'react-hot-toast';

export function PaymentStepClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<OnboardingSessionRow | null>(null);
  const [payfast, setPayfast] = useState<{
    processUrl: string;
    fields: Record<string, string>;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const sessionId =
    searchParams.get('session_id') ??
    (typeof window !== 'undefined'
      ? localStorage.getItem(LOCAL_STORAGE_SESSION_KEY)
      : null) ??
    '';

  useEffect(() => {
    if (!sessionId) {
      router.replace('/onboarding/account');
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, sessionId);

    fetch(`/api/onboarding/session?id=${sessionId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.session) {
          setSession(json.session);
          if (json.session.payment_status === 'complete') {
            router.replace(`/onboarding/setup?session_id=${sessionId}`);
          }
        }
      })
      .catch(console.error);
  }, [sessionId, router]);

  const status = searchParams.get('status');
  const cancelled = status === 'cancelled';

  const handlePay = () => {
    if (!sessionId) return;
    startTransition(async () => {
      const result = await initiateOnboardingPayment(sessionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPayfast({ processUrl: result.processUrl, fields: result.fields });
    });
  };

  if (payfast) {
    return (
      <>
        <ProgressBar currentStep='payment' />
        <p className='text-center text-sm text-muted-foreground'>
          Redirecting to PayFast…
        </p>
        <PayFastRedirectForm action={payfast.processUrl} fields={payfast.fields} />
      </>
    );
  }

  const total = session?.total_amount_cents ?? 0;

  return (
    <>
      <ProgressBar currentStep='payment' />
      <StepHeader
        title='Secure payment'
        description='One payment covers all children selected. After payment you will complete each child profile.'
      />

      {cancelled ? (
        <p className='mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          Payment was cancelled. You can try again when ready.
        </p>
      ) : null}

      <div className='rounded-xl border border-border bg-card p-6 text-center'>
        <p className='text-sm text-muted-foreground'>Total amount</p>
        <p className='mt-1 text-3xl font-semibold text-[hsl(210,100%,25%)]'>
          R{(total / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </p>
        <p className='mt-2 text-sm text-muted-foreground'>
          {session?.child_count ?? '—'} child(ren)
        </p>
        <Button
          type='button'
          className='mt-6 w-full'
          onClick={handlePay}
          disabled={pending || !session}
        >
          {pending ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Preparing checkout…
            </>
          ) : (
            'Pay with PayFast'
          )}
        </Button>
      </div>
    </>
  );
}
