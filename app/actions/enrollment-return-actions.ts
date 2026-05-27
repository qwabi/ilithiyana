'use server';

import { fulfillPaidEnrollmentLead } from '@/lib/fulfill-enrollment-payment';
import type { FulfillPaymentResult } from '@/lib/fulfill-enrollment-payment';
import { fulfillSubscriptionRenewalPayment } from '@/lib/fulfill-subscription-payment';
import { createServiceClient } from '@/lib/supabase/server';

/** Called when the parent lands on the PayFast return (success) URL. */
export async function processPaymentReturn(
  leadOrPaymentId: string,
  payfastPaymentId?: string | null
): Promise<FulfillPaymentResult> {
  const supabase = createServiceClient();

  const { data: renewalPayment } = await supabase
    .from('payments')
    .select('id, subscription_id, status')
    .eq('id', leadOrPaymentId)
    .not('subscription_id', 'is', null)
    .maybeSingle();

  if (renewalPayment?.subscription_id) {
    return fulfillSubscriptionRenewalPayment(leadOrPaymentId, {
      payfastPaymentId: payfastPaymentId ?? undefined,
    });
  }

  return fulfillPaidEnrollmentLead(leadOrPaymentId, {
    payfastPaymentId: payfastPaymentId ?? undefined,
  });
}
