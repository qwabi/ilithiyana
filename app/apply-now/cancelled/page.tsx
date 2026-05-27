import { redirect } from "next/navigation";
import { buildPayfastReturnUrls } from "@/lib/payfast-return-urls";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/** Legacy PayFast cancel path — forwards to /payment/return with full query params. */
export default async function ApplyCancelledLegacyPage({
  searchParams: searchParamsProp,
}: {
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const searchParams = await Promise.resolve(searchParamsProp);
  const leadRaw = searchParams.lead ?? searchParams.application_id;
  const leadId = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw)?.trim();

  if (!leadId || !isSupabaseConfigured()) {
    redirect("/payment/return?status=cancelled");
  }

  const supabase = createServiceClient();
  const { data: lead } = await supabase
    .from("enrollment_leads")
    .select("id, package_id, learner_first_name")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) {
    redirect("/payment/return?status=cancelled");
  }

  const flow =
    (Array.isArray(searchParams.from)
      ? searchParams.from[0]
      : searchParams.from) === "dashboard"
      ? ("dashboard" as const)
      : undefined;

  const { cancelUrl } = buildPayfastReturnUrls({
    applicationId: lead.id,
    packageId: lead.package_id,
    learnerFirstName: lead.learner_first_name,
    flow,
  });

  redirect(cancelUrl);
}
