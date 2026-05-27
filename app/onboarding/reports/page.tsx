import { Suspense } from 'react';
import { ReportsStepClient } from '@/components/onboarding/ReportsStepClient';

export default function OnboardingReportsPage() {
  return (
    <Suspense fallback={<p className='text-center text-sm'>Loading…</p>}>
      <ReportsStepClient />
    </Suspense>
  );
}
