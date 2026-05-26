import { NextResponse } from 'next/server';
import { provisionParentAccount } from '@/lib/parent-auth';
import { mergeCompletedSteps } from '@/lib/onboarding/steps';
import { onboardingStartSchema } from '@/lib/onboarding/validations';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = onboardingStartSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid input';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const data = parsed.data;
  const email = data.parentEmail.trim().toLowerCase();

  let userId: string;
  try {
    const provisioned = await provisionParentAccount({
      email,
      firstName: data.parentFirstName,
      lastName: data.parentLastName,
      phone: data.parentPhone,
      province: data.province,
      preferredContact: data.preferredContact,
      password: data.password,
    });
    userId = provisioned.userId;
  } catch (e) {
    console.error('onboarding/start provision:', e);
    return NextResponse.json(
      {
        error:
          'Could not create your account. Try signing in if you already enrolled.',
      },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  if (data.sessionId) {
    const { data: prior } = await supabase
      .from('onboarding_sessions')
      .select('completed_steps')
      .eq('id', data.sessionId)
      .maybeSingle();

    const { data: existing, error: updateError } = await supabase
      .from('onboarding_sessions')
      .update({
        user_id: userId,
        email,
        parent_first_name: data.parentFirstName,
        parent_last_name: data.parentLastName,
        parent_phone: data.parentPhone,
        parent_address: data.parentAddress,
        province: data.province,
        preferred_contact: data.preferredContact,
        popia_consent: true,
        popia_consent_at: now,
        current_step: 'children',
        completed_steps: mergeCompletedSteps(
          (prior?.completed_steps as string[]) ?? [],
          'account'
        ),
      })
      .eq('id', data.sessionId)
      .select('id, current_step')
      .maybeSingle();

    if (updateError || !existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      sessionId: existing.id,
      currentStep: existing.current_step,
      userId,
    });
  }

  const { data: row, error } = await supabase
    .from('onboarding_sessions')
    .insert({
      user_id: userId,
      email,
      parent_first_name: data.parentFirstName,
      parent_last_name: data.parentLastName,
      parent_phone: data.parentPhone,
      parent_address: data.parentAddress,
      province: data.province,
      preferred_contact: data.preferredContact,
      popia_consent: true,
      popia_consent_at: now,
      current_step: 'children',
      completed_steps: ['account'],
    })
    .select('id, current_step')
    .single();

  if (error || !row) {
    console.error('onboarding/start insert:', error);
    const hint =
      error?.code === 'PGRST205'
        ? 'Onboarding database setup is incomplete. Run: npx supabase db push'
        : null;
    return NextResponse.json(
      {
        error: hint ?? 'Could not start onboarding session',
        ...(process.env.NODE_ENV === 'development' && error?.message
          ? { detail: error.message }
          : {}),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sessionId: row.id,
    currentStep: row.current_step,
    userId,
  });
}
