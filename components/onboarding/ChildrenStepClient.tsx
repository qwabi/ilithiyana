'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { PackageCard } from '@/components/onboarding/PackageCard';
import { saveOnboardingChildren } from '@/app/actions/onboarding-actions';
import { packages } from '@/lib/site-config';
import { packageAmountCents } from '@/lib/payfast';
import { LOCAL_STORAGE_SESSION_KEY } from '@/lib/onboarding/constants';
import toast from 'react-hot-toast';

type SlotSelection = Record<number, string>;

export function ChildrenStepClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [childCount, setChildCount] = useState(1);
  const [selections, setSelections] = useState<SlotSelection>({ 1: '' });
  const [sessionId, setSessionId] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const fromUrl = searchParams.get('session_id');
    const fromStorage =
      typeof window !== 'undefined'
        ? localStorage.getItem(LOCAL_STORAGE_SESSION_KEY)
        : null;
    const id = fromUrl ?? fromStorage ?? '';
    if (id) setSessionId(id);
  }, [searchParams]);

  const adjustCount = (delta: number) => {
    setChildCount((c) => {
      const next = Math.min(6, Math.max(1, c + delta));
      setSelections((prev) => {
        const copy = { ...prev };
        for (let i = 1; i <= next; i++) {
          if (!copy[i]) copy[i] = '';
        }
        Object.keys(copy).forEach((k) => {
          if (Number(k) > next) delete copy[Number(k)];
        });
        return copy;
      });
      return next;
    });
  };

  const totalCents = Array.from({ length: childCount }, (_, i) => i + 1).reduce(
    (sum, slot) => {
      const pkgId = selections[slot];
      return sum + (pkgId ? packageAmountCents(pkgId) : 0);
    },
    0
  );

  const handleContinue = () => {
    if (!sessionId) {
      toast.error('Start from account step first');
      router.push('/onboarding/account');
      return;
    }

    for (let slot = 1; slot <= childCount; slot++) {
      if (!selections[slot]) {
        toast.error(`Select a package for child ${slot}`);
        return;
      }
    }

    const payload = Array.from({ length: childCount }, (_, i) => {
      const slot = i + 1;
      const packageId = selections[slot]!;
      const pkg = packages.find((p) => p.id === packageId)!;
      return {
        learner_slot: slot,
        package_id: packageId,
        package_name: pkg.name,
        price_cents: pkg.amountCents,
      };
    });

    startTransition(async () => {
      const result = await saveOnboardingChildren({
        sessionId,
        childCount,
        selections: payload,
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Something went wrong. Please try again.');
        return;
      }
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, sessionId);
      router.push(`/onboarding/payment?session_id=${sessionId}`);
    });
  };

  return (
    <>
      <ProgressBar currentStep='children' />
      <StepHeader
        title='How many children are you enrolling?'
        description='Choose a package for each child. You will pay one combined amount in the next step.'
      />

      <div className='mb-6 flex items-center justify-center gap-4'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={() => adjustCount(-1)}
          disabled={childCount <= 1}
          aria-label='Fewer children'
        >
          <Minus className='h-4 w-4' />
        </Button>
        <span className='text-lg font-semibold text-[hsl(210,100%,25%)]'>
          {childCount} {childCount === 1 ? 'child' : 'children'}
        </span>
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={() => adjustCount(1)}
          disabled={childCount >= 6}
          aria-label='More children'
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>

      <div className='space-y-8'>
        {Array.from({ length: childCount }, (_, i) => {
          const slot = i + 1;
          return (
            <section key={slot}>
              <h2 className='mb-3 text-sm font-semibold text-[hsl(210,100%,25%)]'>
                Child {slot}
              </h2>
              <div className='grid gap-3 sm:grid-cols-2'>
                {packages.map((pkg) => (
                  <PackageCard
                    key={`${slot}-${pkg.id}`}
                    id={pkg.id}
                    name={pkg.name}
                    price={pkg.price}
                    features={pkg.features}
                    selected={selections[slot] === pkg.id}
                    onSelect={() =>
                      setSelections((prev) => ({ ...prev, [slot]: pkg.id }))
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className='mt-6 text-center text-sm text-muted-foreground'>
        Total due today:{' '}
        <strong className='text-[hsl(210,100%,25%)]'>
          R{(totalCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </strong>
      </p>

      <Button
        type='button'
        className='mt-4 w-full'
        onClick={handleContinue}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Saving…
          </>
        ) : (
          'Continue to payment'
        )}
      </Button>
    </>
  );
}
