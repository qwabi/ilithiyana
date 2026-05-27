import { PaymentReturnCard } from "@/app/components/payment/PaymentReturnCard";
import { processPaymentReturn } from "@/app/actions/enrollment-return-actions";
import { parsePaymentReturnParams } from "@/lib/payfast-return-urls";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { brand } from "@/lib/site-config";
import type { FulfillPaymentResult } from "@/lib/fulfill-enrollment-payment";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Payment | ${brand.name}`,
  description: "Payment return confirmation for Ilithiyana Academics.",
};

export const dynamic = "force-dynamic";

export type PaymentFulfillmentView =
  | { state: "skipped" }
  | { state: "success"; alreadyPaid?: boolean; applicationId?: string }
  | { state: "error"; message: string };

function toFulfillmentView(
  result: FulfillPaymentResult,
): PaymentFulfillmentView {
  if (!result.ok) {
    return { state: "error", message: result.error };
  }
  return {
    state: "success",
    alreadyPaid: result.alreadyPaid,
    applicationId: result.applicationId,
  };
}

export default async function PaymentReturnPage({
  searchParams: searchParamsProp,
}: {
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const searchParams = await Promise.resolve(searchParamsProp);

  // #region agent log
  fetch('http://127.0.0.1:7402/ingest/d851579b-cb6d-4eb5-ad9a-a6e345f4c63d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5d33ef'},body:JSON.stringify({sessionId:'5d33ef',location:'payment/return/page.tsx:entry',message:'searchParams resolved',data:{isPromise:typeof (searchParamsProp as { then?: unknown })?.then==='function',status:searchParams.status,applicationId:searchParams.application_id,package:searchParams.package,learnerName:searchParams.learner_name},timestamp:Date.now(),hypothesisId:'H1-async-searchParams'})}).catch(()=>{});
  // #endregion

  const view = parsePaymentReturnParams(searchParams);

  // #region agent log
  fetch('http://127.0.0.1:7402/ingest/d851579b-cb6d-4eb5-ad9a-a6e345f4c63d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5d33ef'},body:JSON.stringify({sessionId:'5d33ef',location:'payment/return/page.tsx:parsed',message:'parsePaymentReturnParams result',data:{kind:view.kind},timestamp:Date.now(),hypothesisId:'H1-async-searchParams'})}).catch(()=>{});
  // #endregion

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fulfillment: PaymentFulfillmentView = { state: "skipped" };

  if (view.kind === "success") {
    const payfastIdRaw = searchParams.pf_payment_id ?? searchParams.payment_id;
    const payfastPaymentId = Array.isArray(payfastIdRaw)
      ? payfastIdRaw[0]
      : typeof payfastIdRaw === "string"
        ? payfastIdRaw
        : undefined;

    const result = await processPaymentReturn(
      view.applicationId,
      payfastPaymentId,
    );
    fulfillment = toFulfillmentView(result);
  }

  const fulfillOk =
    fulfillment.state === "success" &&
    (fulfillment.alreadyPaid || fulfillment.applicationId);

  const redirectParam = (() => {
    const raw = searchParams.redirect;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v !== "string") return undefined;
    const path = v.trim();
    if (!path.startsWith("/") || path.startsWith("//")) return undefined;
    return path;
  })();

  const defaultDashboard =
    view.kind !== "error"
      ? (view.redirect ??
        (view.flow === "dashboard" ? "/dashboard/children" : "/dashboard"))
      : "/dashboard";

  const dashboardHref = user
    ? (redirectParam ?? defaultDashboard)
    : fulfillOk
      ? `/login?redirect=${encodeURIComponent(redirectParam ?? defaultDashboard)}`
      : "/login?redirect=/dashboard";

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
