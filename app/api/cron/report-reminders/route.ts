import { NextResponse } from 'next/server';
import { addHours } from 'date-fns';
import { sendEmail } from '@/lib/email';
import { missingReportReminderEmail } from '@/lib/email/templates';
import { brand } from '@/lib/site-config';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('secret') === secret;
}

/** Remind parents 48h after enrollment when no school report was uploaded. */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = createServiceClient();
  const cutoff = addHours(new Date(), -48).toISOString();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;

  const { data: apps, error } = await supabase
    .from('applications')
    .select(
      `
      id,
      learner_id,
      created_at,
      allocation_status,
      learners (
        id, first_name, last_name,
        parents ( email, first_name )
      )
    `
    )
    .eq('allocation_status', 'pending_report')
    .lte('created_at', cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const app of apps ?? []) {
    const learnerId = app.learner_id as string;
    const { count } = await supabase
      .from('learner_reports')
      .select('id', { count: 'exact', head: true })
      .eq('learner_id', learnerId);

    if ((count ?? 0) > 0) continue;

    const learner = app.learners as {
      first_name: string;
      last_name: string;
      parents: { email: string; first_name: string } | null;
    } | null;

    const parent = learner?.parents;
    if (!parent?.email || !learner) continue;

    const tpl = missingReportReminderEmail({
      parentName: parent.first_name,
      learnerName: `${learner.first_name} ${learner.last_name}`,
      uploadUrl: `${site}/dashboard/learners/${learnerId}/reports`,
    });

    const result = await sendEmail({
      to: parent.email,
      subject: tpl.subject,
      html: tpl.html,
    });

    if (result.ok) sent++;
  }

  return NextResponse.json({ ok: true, checked: apps?.length ?? 0, sent });
}
