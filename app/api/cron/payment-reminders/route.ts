import { NextResponse } from 'next/server';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { sendSubscriptionReminderEmail } from '@/lib/email';
import { packages } from '@/lib/site-config';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 'no supabase' });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      package_id,
      amount_cents,
      next_billing_date,
      status,
      learners (first_name, last_name, parent_id),
      parents:parent_id (email, first_name, last_name)
    `
    )
    .in('status', ['active', 'overdue'])
    .lte('next_reminder_at', now)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const sub of subs ?? []) {
    const learner = sub.learners as {
      first_name: string;
      last_name: string;
    } | null;
    const parent = sub.parents as {
      email: string;
      first_name: string;
      last_name: string;
    } | null;

    if (!parent?.email || !learner) continue;

    const pkg = packages.find((p) => p.id === sub.package_id);
    const amount = `R${((sub.amount_cents ?? 0) / 100).toFixed(2)}`;

    await sendSubscriptionReminderEmail({
      to: parent.email,
      parentName: `${parent.first_name} ${parent.last_name}`.trim(),
      learnerName: `${learner.first_name} ${learner.last_name}`.trim(),
      packageName: pkg?.name ?? sub.package_id,
      amount,
      dueDate: sub.next_billing_date ?? 'soon',
      overdue: sub.status === 'overdue',
    });

    await supabase
      .from('subscriptions')
      .update({
        next_reminder_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .eq('id', sub.id);

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
