import { NextResponse } from 'next/server';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { isPayfastConfigured } from '@/lib/payfast';
import { buildSubscriptionRenewalCheckout } from '@/lib/subscription-checkout';

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

  const checkout = await buildSubscriptionRenewalCheckout(
    subscriptionId,
    user.id
  );

  if ('error' in checkout) {
    return NextResponse.json({ error: checkout.error }, { status: 400 });
  }

  const inputs = Object.entries(checkout.fields)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}" />`
    )
    .join('');

  const html = `<!DOCTYPE html><html><body>
<form id="pf" method="post" action="${checkout.processUrl}">${inputs}</form>
<script>document.getElementById('pf').submit();</script></body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
