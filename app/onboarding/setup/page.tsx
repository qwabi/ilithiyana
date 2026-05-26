import { Suspense } from 'react';
import { SetupStepClient } from '@/components/onboarding/SetupStepClient';

export default function OnboardingSetupPage() {
  return (
    <Suspense fallback={<p className='text-center text-sm'>Loading…</p>}>
      <SetupStepClient />
    </Suspense>
  );
}
