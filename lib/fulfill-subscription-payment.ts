import { createServiceClient } from '@/lib/supabase/server';
import type { FulfillPaymentResult } from '@/lib/fulfill-enrollment-payment';

/** Completes a PayFast return for a pending subscription renewal payment row. */
export async function fulfillSubscriptionRenewalPayment(
  paymentId: string,
  opts?: { payfastPaymentId?: string }
): Promise<FulfillPaymentResult> {
  const supabase = createServiceClient();

  const { data: payment, error: payError } = await supabase
    .from('payments')
    .select('id, subscription_id, parent_id, learner_id, amount_cents, status')
    .eq('id', paymentId)
    .maybeSingle();

  if (payError || !payment?.subscription_id) {
    return { ok: false, error: 'Renewal payment not found' };
  }

  if (payment.status === 'complete') {
    return { ok: true, alreadyPaid: true };
  }

  const now = new Date().toISOString();
  const billingEnd = new Date();
  billingEnd.setMonth(billingEnd.getMonth() + 1);

  const { error: payUpdateError } = await supabase
    .from('payments')
    .update({
      status: 'complete',
      paid_at: now,
      payfast_payment_id: opts?.payfastPaymentId ?? null,
      gateway_ref: opts?.payfastPaymentId ?? null,
    })
    .eq('id', paymentId);

  if (payUpdateError) {
    return { ok: false, error: payUpdateError.message };
  }

  const { error: subError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      period_start: new Date().toISOString().slice(0, 10),
      period_end: billingEnd.toISOString().slice(0, 10),
      billing_date: new Date().toISOString().slice(0, 10),
      next_billing_date: billingEnd.toISOString().slice(0, 10),
    })
    .eq('id', payment.subscription_id);

  if (subError) {
    return { ok: false, error: subError.message };
  }

  return { ok: true };
}
