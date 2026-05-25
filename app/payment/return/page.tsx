import { PaymentReturnCard } from '@/app/components/payment/PaymentReturnCard';
import { processPaymentReturn } from '@/app/actions/enrollment-return-actions';
import { parsePaymentReturnParams } from '@/lib/payfast-return-urls';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { brand } from '@/lib/site-config';
import type { FulfillPaymentResult } from '@/lib/fulfill-enrollment-payment';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Payment | ${brand.name}`,
  description: 'Payment return confirmation for Ilithiyana Academics.',
};

export const dynamic = 'force-dynamic';

export type PaymentFulfillmentView =
  | { state: 'skipped' }
  | { state: 'success'; alreadyPaid?: boolean; applicationId?: string }
  | { state: 'error'; message: string };

function toFulfillmentView(
  result: FulfillPaymentResult
): PaymentFulfillmentView {
  if (!result.ok) {
    return { state: 'error', message: result.error };
  }
  return {
    state: 'success',
    alreadyPaid: result.alreadyPaid,
    applicationId: result.applicationId,
  };
}

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const view = parsePaymentReturnParams(searchParams);

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fulfillment: PaymentFulfillmentView = { state: 'skipped' };

  if (view.kind === 'success') {
    const payfastIdRaw = searchParams.pf_payment_id ?? searchParams.payment_id;
    const payfastPaymentId = Array.isArray(payfastIdRaw)
      ? payfastIdRaw[0]
      : typeof payfastIdRaw === 'string'
        ? payfastIdRaw
        : undefined;

    const result = await processPaymentReturn(
      view.applicationId,
      payfastPaymentId
    );
    fulfillment = toFulfillmentView(result);
  }

  const fulfillOk =
    fulfillment.state === 'success' &&
    (fulfillment.alreadyPaid || fulfillment.applicationId);

  const redirectParam = (() => {
    const raw = searchParams.redirect;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v !== 'string') return undefined;
    const path = v.trim();
    if (!path.startsWith('/') || path.startsWith('//')) return undefined;
    return path;
  })();

  const defaultDashboard =
    view.kind !== 'error'
      ? view.redirect ??
        (view.flow === 'dashboard' ? '/dashboard/children' : '/dashboard')
      : '/dashboard';

  const dashboardHref = user
    ? redirectParam ?? defaultDashboard
    : fulfillOk
      ? `/login?redirect=${encodeURIComponent(redirectParam ?? defaultDashboard)}`
      : '/login?redirect=/dashboard';

  return (
    <PaymentReturnCard
      view={view}
      dashboardHref={dashboardHref}
      fulfillment={fulfillment}
      isLoggedIn={Boolean(user)}
      autoSignIn={fulfillOk && !user}
    />
  );
}
