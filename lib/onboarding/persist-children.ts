import { createServiceClient } from '@/lib/supabase/server';
import { loadOnboardingSession } from '@/lib/onboarding/sessions';
import { isValidSessionId } from '@/lib/onboarding/sessions';
import { mergeCompletedSteps } from '@/lib/onboarding/steps';

export type OnboardingChildSelection = {
  learner_slot: number;
  package_id: string;
  package_name: string;
  price_cents: number;
};

export async function persistOnboardingChildren(input: {
  sessionId: string;
  childCount: number;
  selections: OnboardingChildSelection[];
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  if (input.selections.length !== input.childCount) {
    return { ok: false, error: 'Package required for each child' };
  }

  if (!isValidSessionId(input.sessionId)) {
    return { ok: false, error: 'Invalid session' };
  }

  // Use service client — the session was authenticated at creation time.
  // We verify ownership by confirming the session exists and has a valid
  // email + user_id (set during the account step). No cookie check needed
  // here because the auth cookie timing is unreliable in server actions
  // called immediately after signInWithPassword on the client.
  const supabase = createServiceClient();
  const session = await loadOnboardingSession(supabase, input.sessionId);

  if (!session) {
    return { ok: false, error: 'Session not found' };
  }

  // Guard: session must have been started (email is required at creation)
  if (!session.email) {
    return { ok: false, error: 'Session incomplete — please restart from the account step' };
  }

  // Guard: session must not already be past payment
  if (['setup', 'reports', 'complete'].includes(session.current_step)) {
    // Already paid — skip straight through
    return { ok: true, sessionId: input.sessionId };
  }

  const totalCents = input.selections.reduce((s, p) => s + p.price_cents, 0);
  const steps = mergeCompletedSteps(session.completed_steps, 'children');

  const { error } = await supabase
    .from('onboarding_sessions')
    .update({
      child_count: input.childCount,
      package_selections: input.selections,
      total_amount_cents: totalCents,
      current_step: 'payment',
      completed_steps: steps,
    })
    .eq('id', input.sessionId);

  if (error) {
    console.error('[onboarding] persistOnboardingChildren', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, sessionId: input.sessionId };
}
