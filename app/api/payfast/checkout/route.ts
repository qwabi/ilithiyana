import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  buildPayfastFormFields,
  getProcessUrl,
  isPayfastConfigured,
  payfastBillingDateToday,
} from '@/lib/payfast';
import { buildPayfastReturnUrls } from '@/lib/payfast-return-urls';
import { brand, packages } from '@/lib/site-config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isPayfastConfigured()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const sessionClient = createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const formData = await request.formData();
  const subscriptionId = String(formData.get('subscriptionId') ?? '');

  if (!subscriptionId) {
    return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: parentRow } = await supabase
    .from('parents')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!parentRow) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  }

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('*, learners (*)')
    .eq('id', subscriptionId)
    .eq('parent_id', parentRow.id)
    .maybeSingle();

  if (subError || !sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const parent = parentRow;
  const learner = sub.learners as {
    first_name: string;
    last_name: string;
  };

  const leadId = crypto.randomUUID();
  const pkg = packages.find((p) => p.id === sub.package_id);

  await supabase.from('enrollment_leads').insert({
    id: leadId,
    status: 'awaiting_payment',
    lead_type: 'add_child',
    parent_id: parent.id,
    parent_first_name: parent.first_name,
    parent_last_name: parent.last_name,
    parent_email: parent.email,
    parent_phone: parent.phone,
    province: parent.province ?? 'Gauteng',
    learner_first_name: learner.first_name,
    learner_last_name: learner.last_name,
    learner_date_of_birth: '2000-01-01',
    learner_school_name: 'Renewal',
    learner_grade: 10,
    subjects: ['English'],
    package_id: sub.package_id,
    schedule: {},
    amount_cents: sub.amount_cents,
  });

  const urls = buildPayfastReturnUrls({
    applicationId: leadId,
    packageId: sub.package_id,
    learnerFirstName: learner.first_name,
    flow: 'dashboard',
  });

  const fields = buildPayfastFormFields({
    paymentId: leadId,
    amountCents: sub.amount_cents,
    itemName: `${brand.name} — ${pkg?.name ?? 'Subscription'} renewal — ${learner.first_name}`,
    email: parent.email,
    nameFirst: parent.first_name,
    nameLast: parent.last_name,
    cellNumber: parent.phone,
    returnUrl: urls.returnUrl,
    cancelUrl: urls.cancelUrl,
    customStr1: leadId,
    customStr2: sub.package_id,
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

  const inputs = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}" />`
    )
    .join('');

  const html = `<!DOCTYPE html><html><body>
<form id="pf" method="post" action="${getProcessUrl()}">${inputs}</form>
<script>document.getElementById('pf').submit();</script></body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
