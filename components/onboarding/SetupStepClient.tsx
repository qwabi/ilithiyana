'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { ChildProfileForm } from '@/components/onboarding/ChildProfileForm';
import { confirmOnboardingPaymentAction } from '@/app/actions/onboarding-actions';
import {
  completedSlots,
  type OnboardingSessionRow,
} from '@/lib/onboarding/sessions';
import { LOCAL_STORAGE_SESSION_KEY } from '@/lib/onboarding/constants';
import toast from 'react-hot-toast';

export function SetupStepClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<OnboardingSessionRow | null>(null);
  const [doneSlots, setDoneSlots] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sessionId = searchParams.get('session_id') ?? '';
  const payfastSuccess = searchParams.get('status') === 'success';

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    const res = await fetch(`/api/onboarding/session?id=${sessionId}`);
    const json = await res.json();
    if (json.session) {
      setSession(json.session);
      setDoneSlots(completedSlots(json.session));
      if (json.session.payment_status !== 'complete' && !payfastSuccess) {
        router.replace(`/onboarding/payment?session_id=${sessionId}`);
      }
    }
  }, [sessionId, router, payfastSuccess]);

  useEffect(() => {
    if (!sessionId) {
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) router.replace(`/onboarding/setup?session_id=${stored}`);
      else router.replace('/onboarding/account');
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, sessionId);

    if (payfastSuccess) {
      setConfirming(true);
      setConfirmError(null);
      confirmOnboardingPaymentAction(sessionId, sessionId)
        .then((r) => {
          if (!r.ok) {
            const msg = r.error ?? 'Could not confirm payment';
            setConfirmError(msg);
            toast.error(msg);
            return;
          }
          setConfirmError(null);
          return loadSession();
        })
        .finally(() => setConfirming(false));
    } else {
      void loadSession();
    }
  }, [sessionId, payfastSuccess, loadSession, router]);

  const retryPaymentConfirm = () => {
    if (!sessionId) return;
    setConfirming(true);
    setConfirmError(null);
    confirmOnboardingPaymentAction(sessionId, sessionId)
      .then((r) => {
        if (!r.ok) {
          const msg = r.error ?? 'Could not confirm payment';
          setConfirmError(msg);
          toast.error(msg);
          return;
        }
        setConfirmError(null);
        return loadSession();
      })
      .finally(() => setConfirming(false));
  };

  const handleChildSaved = (slot: number) => {
    setDoneSlots((prev) => (prev.includes(slot) ? prev : [...prev, slot]));
    void loadSession();
  };

  const handleContinue = () => {
    if (!session || !sessionId) return;
    const required = session.child_count ?? 0;
    if (doneSlots.length < required) {
      toast.error(`Save all ${required} child profiles first`);
      return;
    }

    const learnerIds = session.learner_ids;

    startTransition(async () => {
      const res = await fetch('/api/onboarding/save-learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, learnerIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Could not continue');
        return;
      }
      router.push(`/onboarding/reports?session_id=${sessionId}`);
    });
  };

  const paymentIncomplete =
    session && session.payment_status !== 'complete' && payfastSuccess;

  if (confirming || !session) {
    return (
      <p className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        {confirming ? 'Confirming payment…' : 'Loading…'}
      </p>
    );
  }

  const slots = Array.from({ length: session.child_count ?? 0 }, (_, i) => i + 1);

  return (
    <>
      <ProgressBar currentStep='setup' />
      {(confirmError || paymentIncomplete) && (
        <div className='mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4'>
          <p className='text-sm font-medium text-amber-900'>
            Payment not confirmed yet
          </p>
          {confirmError ? (
            <p className='mt-1 text-sm text-amber-800'>{confirmError}</p>
          ) : null}
          <Button
            type='button'
            variant='outline'
            className='mt-3'
            onClick={retryPaymentConfirm}
            disabled={confirming}
          >
            Confirm payment again
          </Button>
        </div>
      )}
      <StepHeader
        title='Child profiles'
        description='Add each child’s details. You cannot change packages after payment.'
      />

      <p className='mb-4 text-center text-xs text-muted-foreground'>
        <Link href='/onboarding/payment' className='pointer-events-none opacity-50'>
          ← Back to packages
        </Link>{' '}
        (disabled after payment)
      </p>

      <div className='space-y-6'>
        {slots.map((slot) => {
          const pkg = session.package_selections.find(
            (p) => p.learner_slot === slot
          );
          if (!pkg) return null;
          const done = doneSlots.includes(slot);
          return (
            <div key={slot}>
              {done ? (
                <p className='mb-2 text-sm font-medium text-emerald-700'>
                  Child {slot} — saved ✓
                </p>
              ) : null}
              {!done ? (
                <ChildProfileForm
                  sessionId={sessionId}
                  slot={slot}
                  packageInfo={pkg}
                  onSaved={() => handleChildSaved(slot)}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <Button
        type='button'
        className='mt-8 w-full'
        onClick={handleContinue}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Continuing…
          </>
        ) : (
          'Continue to reports (optional)'
        )}
      </Button>
    </>
  );
}
