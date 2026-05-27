import { NextResponse } from "next/server";
import { z } from "zod";
import { brand } from "@/lib/site-config";
import {
  buildPayfastFormFields,
  getProcessUrl,
  isPayfastConfigured,
  payfastBillingDateToday,
} from "@/lib/payfast";
import { devActionLog } from "@/lib/dev-action-log";
import { buildOnboardingPayfastReturnUrls } from "@/lib/payfast-return-urls";
import { loadSessionForRequestHttp } from "@/lib/onboarding/api-auth";

const bodySchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!isPayfastConfigured()) {
    return NextResponse.json(
      { error: "Payment is not configured" },
      { status: 503 },
    );
  }

  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const loaded = await loadSessionForRequestHttp(parsed.data.sessionId);
    if (!loaded.ok) return loaded.response;

    const session = loaded.session;
    if (session.payment_status !== "pending") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 },
      );
    }

    const amountCents = session.total_amount_cents ?? 0;
    if (amountCents < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const hasPackageA = session.package_selections.some(
      (p) => p.package_id === "package-a",
    );
    const urls = buildOnboardingPayfastReturnUrls(session.id);

    const fields = buildPayfastFormFields({
      paymentId: session.id,
      amountCents,
      itemName: `${brand.name} - Family enrolment (${session.child_count ?? 1} children)`,
      email: session.email,
      nameFirst: session.parent_first_name ?? "Parent",
      nameLast: session.parent_last_name ?? "",
      cellNumber: session.parent_phone ?? "",
      returnUrl: urls.returnUrl,
      cancelUrl: urls.cancelUrl,
      customStr1: session.id,
      subscription: hasPackageA
        ? {
            subscriptionType: "1",
            frequency: "3",
            cycles: "0",
            billingDate: payfastBillingDateToday(),
          }
        : undefined,
    });

    devActionLog({
      location: "api/onboarding/initiate-payment",
      message: "checkout prepared",
      data: {
        sessionId: session.id,
        amountCents,
        hasPackageA,
        signaturePrefix: fields.signature?.slice(0, 8),
        processUrlHost: new URL(getProcessUrl()).host,
      },
    });

    return NextResponse.json({
      processUrl: getProcessUrl(),
      fields,
    });
  } catch (e) {
    console.error("POST /api/onboarding/initiate-payment", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
