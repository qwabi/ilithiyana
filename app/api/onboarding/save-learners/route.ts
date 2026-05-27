import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { loadSessionForRequestHttp } from '@/lib/onboarding/api-auth';
import { allSetupSlotsFilled } from '@/lib/onboarding/sessions';
import { mergeCompletedSteps } from '@/lib/onboarding/steps';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  learnerIds: z.array(z.string().uuid()),
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

    const session = loaded.session;
    if (session.payment_status !== 'complete') {
      return NextResponse.json(
        { error: 'Payment required' },
        { status: 403 }
      );
    }

    const merged = {
      ...session,
      learner_ids: parsed.data.learnerIds,
    };

    if (!allSetupSlotsFilled(merged)) {
      return NextResponse.json(
        { error: 'Complete all child profiles first' },
        { status: 400 }
      );
    }

    const steps = mergeCompletedSteps(session.completed_steps, 'setup');
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('onboarding_sessions')
      .update({
        learner_ids: parsed.data.learnerIds,
        current_step: 'reports',
        completed_steps: steps,
      })
      .eq('id', parsed.data.sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/onboarding/save-learners', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
