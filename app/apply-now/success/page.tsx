import { redirect } from 'next/navigation';
import { buildPayfastReturnUrls } from '@/lib/payfast-return-urls';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';

/** Legacy PayFast return path — forwards to /payment/return with correct query params. */
export default async function ApplySuccessLegacyPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const leadRaw = searchParams.lead;
  const leadId = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw)?.trim();

  if (!leadId || !isSupabaseConfigured()) {
    redirect('/payment/return');
  }

  const supabase = createServiceClient();
  const { data: lead } = await supabase
    .from('enrollment_leads')
    .select('id, package_id, learner_first_name')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) {
    redirect('/payment/return');
  }

  const flow =
    (Array.isArray(searchParams.from) ? searchParams.from[0] : searchParams.from) ===
    'dashboard'
      ? ('dashboard' as const)
      : undefined;

  const { returnUrl } = buildPayfastReturnUrls({
    applicationId: lead.id,
    packageId: lead.package_id,
    learnerFirstName: lead.learner_first_name,
    flow,
  });

  redirect(returnUrl);
}
