'use client';

import { cn } from '@/lib/utils';
import {
  PROGRESS_STEPS,
  type OnboardingStep,
} from '@/lib/onboarding/constants';

const LABELS: Record<OnboardingStep, string> = {
  account: 'Account',
  children: 'Children',
  payment: 'Payment',
  setup: 'Profiles',
  reports: 'Reports',
  complete: 'Done',
};

export function ProgressBar({ currentStep }: { currentStep: OnboardingStep }) {
  const currentIdx = PROGRESS_STEPS.indexOf(currentStep);

  return (
    <nav aria-label='Enrolment progress' className='mb-8'>
      <ol className='flex flex-wrap items-center justify-center gap-2 sm:gap-4'>
        {PROGRESS_STEPS.map((step, idx) => {
          const done = idx < currentIdx || currentStep === 'complete';
          const active = step === currentStep;
          return (
            <li key={step} className='flex items-center gap-2'>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  active && !done && 'bg-accent text-[hsl(210,100%,25%)] ring-2 ring-primary',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? '✓' : idx + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs sm:inline',
                  active ? 'font-medium text-[hsl(210,100%,25%)]' : 'text-muted-foreground'
                )}
              >
                {LABELS[step]}
              </span>
              {idx < PROGRESS_STEPS.length - 1 && (
                <span
                  className='mx-1 hidden h-px w-6 bg-border sm:block'
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
