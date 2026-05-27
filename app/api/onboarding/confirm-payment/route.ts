import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { loadSessionForRequestHttp } from '@/lib/onboarding/api-auth';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  payfastPaymentId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const loaded = await loadSessionForRequestHttp(parsed.data.sessionId);
    if (!loaded.ok) return loaded.response;

    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('confirm_onboarding_payment', {
      p_session_id: parsed.data.sessionId,
      p_payfast_payment_id:
        parsed.data.payfastPaymentId ?? parsed.data.sessionId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: data });
  } catch (e) {
    console.error('POST /api/onboarding/confirm-payment', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
