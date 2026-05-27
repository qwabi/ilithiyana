import { createServiceClient } from '@/lib/supabase/server';
import {
  buildPayfastFormFields,
  getProcessUrl,
  payfastBillingDateToday,
} from '@/lib/payfast';
import { buildPayfastReturnUrls } from '@/lib/payfast-return-urls';
import { brand, packages } from '@/lib/site-config';

export type SubscriptionCheckoutResult =
  | { processUrl: string; fields: Record<string, string>; paymentId: string }
  | { error: string };

export async function buildSubscriptionRenewalCheckout(
  subscriptionId: string,
  parentProfileId: string
): Promise<SubscriptionCheckoutResult> {
  const supabase = createServiceClient();

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('*, learners (*)')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (subError || !sub) {
    return { error: 'Subscription not found' };
  }

  const { data: parent } = await supabase
    .from('parents')
    .select('*')
    .eq('profile_id', parentProfileId)
    .maybeSingle();

  if (!parent || sub.parent_id !== parent.id) {
    return { error: 'Forbidden' };
  }

  if (sub.status !== 'overdue' && sub.status !== 'pending') {
    return { error: 'This subscription does not require payment' };
  }

  const learner = sub.learners as {
    first_name: string;
    last_name: string;
    grade: number;
  } | null;

  const { data: payment, error: payInsertError } = await supabase
    .from('payments')
    .insert({
      subscription_id: sub.id,
      parent_id: parent.id,
      learner_id: sub.learner_id,
      amount_cents: sub.amount_cents,
      status: 'pending',
    })
    .select('id')
    .single();

  if (payInsertError || !payment) {
    return { error: 'Could not start payment' };
  }

  const paymentId = payment.id as string;
  const pkg = packages.find((p) => p.id === sub.package_id);

  const urls = buildPayfastReturnUrls({
    applicationId: paymentId,
    packageId: sub.package_id,
    learnerFirstName: learner?.first_name ?? 'Learner',
    flow: 'dashboard',
    redirect: '/dashboard/subscriptions',
  });

  const fields = buildPayfastFormFields({
    paymentId,
    amountCents: sub.amount_cents,
    itemName: `${brand.name} — ${pkg?.name ?? 'Subscription'} renewal — ${learner?.first_name ?? 'Learner'}`,
    itemDescription: pkg?.price ?? 'Subscription renewal',
    email: parent.email,
    nameFirst: parent.first_name,
    nameLast: parent.last_name,
    cellNumber: parent.phone,
    returnUrl: urls.returnUrl,
    cancelUrl: urls.cancelUrl,
    customStr1: paymentId,
    customStr2: `subscription:${sub.id}`,
    subscription:
      sub.package_id === 'package-a'
        ? {
            subscriptionType: '1',
            frequency: '3',
            cycles: '0',
            billingDate: payfastBillingDateToday(),
          }
        : undefined,
  });

  return { processUrl: getProcessUrl(), fields, paymentId };
}
