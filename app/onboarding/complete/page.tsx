'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { LOCAL_STORAGE_SESSION_KEY } from '@/lib/onboarding/constants';

export default function OnboardingCompletePage() {
  useEffect(() => {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  }, []);

  return (
    <>
      <ProgressBar currentStep='complete' />
      <div className='flex flex-col items-center text-center'>
        <CheckCircle className='h-14 w-14 text-emerald-600' aria-hidden />
        <StepHeader
          title='Enrolment complete'
          description='Your family account is ready. View schedules, reports, and billing from your parent dashboard.'
        />
        <Button asChild className='mt-4 w-full max-w-xs'>
          <Link href='/dashboard'>Go to dashboard</Link>
        </Button>
        <Link
          href='/contact'
          className='mt-4 text-sm text-primary underline'
        >
          Questions? Contact us
        </Link>
      </div>
    </>
  );
}
