import { NextResponse } from 'next/server';
import { z } from 'zod';
import { persistOnboardingChildren } from '@/lib/onboarding/persist-children';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  childCount: z.number().int().min(1).max(6),
  selections: z.array(
    z.object({
      learner_slot: z.number().int(),
      package_id: z.enum(['package-a', 'package-b']),
      package_name: z.string(),
      price_cents: z.number().int(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { sessionId, childCount, selections } = parsed.data;
    const result = await persistOnboardingChildren({
      sessionId,
      childCount,
      selections,
    });

    if (!result.ok) {
      const status =
        result.error === 'Session not found'
          ? 404
          : result.error === 'Sign in required'
            ? 401
            : result.error === 'Forbidden'
              ? 403
              : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, sessionId: result.sessionId });
  } catch (e) {
    console.error('POST /api/onboarding/save-children', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
