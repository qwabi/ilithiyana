import { Suspense } from 'react';
import { PaymentStepClient } from '@/components/onboarding/PaymentStepClient';

export default function OnboardingPaymentPage() {
  return (
    <Suspense fallback={<p className='text-center text-sm'>Loading…</p>}>
      <PaymentStepClient />
    </Suspense>
  );
}
