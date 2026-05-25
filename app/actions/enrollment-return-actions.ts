'use server';

import { fulfillPaidEnrollmentLead } from '@/lib/fulfill-enrollment-payment';
import type { FulfillPaymentResult } from '@/lib/fulfill-enrollment-payment';

/** Called when the parent lands on the PayFast return (success) URL. */
export async function processPaymentReturn(
  leadId: string,
  payfastPaymentId?: string | null
): Promise<FulfillPaymentResult> {
  return fulfillPaidEnrollmentLead(leadId, {
    payfastPaymentId: payfastPaymentId ?? undefined,
  });
}
