import { NextResponse } from 'next/server';
import { addDays, format } from 'date-fns';
import { sendSubscriptionReminderEmail } from '@/lib/email';
import { brand, packages } from '@/lib/site-config';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('secret') === secret;
}

/** Sends subscription due reminders for rows due within the next 7 days. */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = createServiceClient();
  const horizon = addDays(new Date(), 3).toISOString();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      package_id,
      amount_cents,
      status,
      period_end,
      next_billing_date,
      next_reminder_at,
      learners (
        id,
        first_name,
        last_name,
        parent_id,
        parents ( first_name, last_name, email )
      )
    `
    )
    .in('status', ['pending', 'overdue', 'active'])
    .or(`next_reminder_at.is.null,next_reminder_at.lte.${horizon}`);

  if (error) {
    console.error('reminder query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subs ?? []) {
    const learner = sub.learners as {
      first_name: string;
      last_name: string;
      parents: {
        first_name: string;
        last_name: string;
        email: string;
      } | null;
    } | null;

    const parent = learner?.parents;
    if (!parent?.email || !learner) {
      skipped++;
      continue;
    }

    const pkg = packages.find((p) => p.id === sub.package_id);
    const amount = `R${(sub.amount_cents / 100).toFixed(2)}`;
    const dueRaw = sub.next_billing_date ?? sub.period_end;
    const dueDate = dueRaw
      ? format(new Date(dueRaw), 'd MMMM yyyy')
      : 'soon';

    const dueSoon =
      dueRaw && new Date(dueRaw) <= addDays(new Date(), 3);
    const isOverdue = sub.status === 'overdue';

    if (!dueSoon && !isOverdue) {
      skipped++;
      continue;
    }

    const result = await sendSubscriptionReminderEmail({
      to: parent.email,
      parentName: `${parent.first_name} ${parent.last_name}`,
      learnerName: `${learner.first_name} ${learner.last_name}`,
      packageName: pkg?.name ?? sub.package_id,
      amount,
      dueDate,
      payUrl: `${site}/dashboard`,
      overdue: isOverdue,
    });

    if (result.ok) {
      sent++;
      await supabase
        .from('subscriptions')
        .update({ next_reminder_at: addDays(new Date(), 7).toISOString() })
        .eq('id', sub.id);
    } else {
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: subs?.length ?? 0,
    sent,
    skipped,
  });
}
