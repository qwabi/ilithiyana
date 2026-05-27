import { Suspense } from 'react';
import { ChildrenStepClient } from '@/components/onboarding/ChildrenStepClient';

export default function OnboardingChildrenPage() {
  return (
    <Suspense fallback={<p className='text-center text-sm'>Loading…</p>}>
      <ChildrenStepClient />
    </Suspense>
  );
}
