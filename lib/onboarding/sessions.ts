import type { SupabaseClient } from '@supabase/supabase-js';
import type { PreferredContactMethod } from '@/lib/types/database';
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
  onboardingStepPath,
} from '@/lib/onboarding/constants';

export {
  ONBOARDING_ACCOUNT_PATH,
  ONBOARDING_STEPS,
  type OnboardingStep,
  onboardingStepPath,
} from '@/lib/onboarding/constants';

export type PackageSelectionSlot = {
  learner_slot: number;
  package_id: string;
  package_name: string;
  price_cents: number;
  learner_id?: string;
};

export type OnboardingSessionRow = {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  email: string;
  parent_first_name: string | null;
  parent_last_name: string | null;
  parent_phone: string | null;
  parent_address: string | null;
  province: string | null;
  preferred_contact: PreferredContactMethod | null;
  child_count: number | null;
  package_selections: PackageSelectionSlot[];
  total_amount_cents: number | null;
  payment_status: string;
  payment_ref: string | null;
  current_step: OnboardingStep;
  completed_steps: string[];
  learner_ids: string[];
  reports_added: boolean;
  popia_consent: boolean;
  created_at: string;
  updated_at: string;
};

export type IncompleteOnboardingSession = {
  id: string;
  current_step: OnboardingStep;
  payment_status: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(id: string): boolean {
  return UUID_RE.test(id);
}

function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

function parsePackageSelections(raw: unknown): PackageSelectionSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const slot = Number(o.learner_slot);
      const packageId = String(o.package_id ?? '');
      if (!slot || !packageId) return null;
      return {
        learner_slot: slot,
        package_id: packageId,
        package_name: String(o.package_name ?? packageId),
        price_cents: Number(o.price_cents ?? o.price ?? 0),
        learner_id: o.learner_id ? String(o.learner_id) : undefined,
      };
    })
    .filter((x): x is PackageSelectionSlot => x !== null);
}

export function mapOnboardingSessionRow(
  data: Record<string, unknown>
): OnboardingSessionRow {
  const step = String(data.current_step ?? 'account');
  return {
    id: String(data.id),
    user_id: (data.user_id as string | null) ?? null,
    parent_id: (data.parent_id as string | null) ?? null,
    email: String(data.email),
    parent_first_name: (data.parent_first_name as string | null) ?? null,
    parent_last_name: (data.parent_last_name as string | null) ?? null,
    parent_phone: (data.parent_phone as string | null) ?? null,
    parent_address: (data.parent_address as string | null) ?? null,
    province: (data.province as string | null) ?? null,
    preferred_contact: (data.preferred_contact as PreferredContactMethod | null) ?? null,
    child_count: data.child_count != null ? Number(data.child_count) : null,
    package_selections: parsePackageSelections(data.package_selections),
    total_amount_cents:
      data.total_amount_cents != null ? Number(data.total_amount_cents) : null,
    payment_status: String(data.payment_status ?? 'pending'),
    payment_ref: (data.payment_ref as string | null) ?? null,
    current_step: isOnboardingStep(step) ? step : 'account',
    completed_steps: Array.isArray(data.completed_steps)
      ? (data.completed_steps as string[])
      : [],
    learner_ids: Array.isArray(data.learner_ids)
      ? (data.learner_ids as string[])
      : [],
    reports_added: Boolean(data.reports_added),
    popia_consent: Boolean(data.popia_consent),
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export async function loadOnboardingSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<OnboardingSessionRow | null> {
  if (!isValidSessionId(sessionId)) return null;

  const { data, error } = await supabase
    .from('onboarding_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !data) {
    if (error?.code !== '42P01') {
      console.error('[onboarding] loadOnboardingSession', error?.message);
    }
    return null;
  }

  return mapOnboardingSessionRow(data as Record<string, unknown>);
}

export function assertSessionAccess(
  session: OnboardingSessionRow,
  opts: { userId?: string | null; email?: string | null }
): boolean {
  if (opts.userId && session.user_id === opts.userId) return true;
  const email = opts.email?.trim().toLowerCase();
  if (email && session.email.trim().toLowerCase() === email) return true;
  // Account step may not have linked user_id yet; allow first authenticated save
  if (opts.userId && !session.user_id) return true;
  return false;
}

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function canAccessStep(
  session: OnboardingSessionRow,
  target: OnboardingStep
): boolean {
  const currentIdx = stepIndex(session.current_step);
  const targetIdx = stepIndex(target);
  if (targetIdx <= currentIdx) return true;
  if (session.completed_steps.includes(target)) return true;
  return false;
}

export function nextStepAfterPayment(): OnboardingStep {
  return 'setup';
}

export async function getIncompleteOnboardingSession(
  supabase: SupabaseClient,
  params: { userId: string; email?: string | null }
): Promise<IncompleteOnboardingSession | null> {
  const email = params.email?.trim().toLowerCase();

  let query = supabase
    .from('onboarding_sessions')
    .select('id, current_step, payment_status')
    .neq('current_step', 'complete')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (email) {
    query = query.or(`user_id.eq.${params.userId},email.ilike.${email}`);
  } else {
    query = query.eq('user_id', params.userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.message?.includes('onboarding_sessions')) {
      return null;
    }
    console.error('[onboarding] getIncompleteOnboardingSession', error.message);
    return null;
  }

  if (!data?.id || !data.current_step || !isOnboardingStep(data.current_step)) {
    return null;
  }

  return {
    id: data.id,
    current_step: data.current_step,
    payment_status: data.payment_status ?? null,
  };
}

/** Dashboard / account resume link — always includes session_id. */
export function resolveOnboardingResumeHref(
  session: IncompleteOnboardingSession
): string {
  const q = new URLSearchParams({ session_id: session.id });

  if (session.payment_status === 'complete') {
    const step: OnboardingStep =
      session.current_step === 'payment' || session.current_step === 'children'
        ? 'setup'
        : session.current_step;
    return `${onboardingStepPath(step)}?${q.toString()}`;
  }

  if (session.current_step === 'payment') {
    // PayFast return_url lands on setup with status=success to confirm payment
    q.set('status', 'success');
    return `/onboarding/setup?${q.toString()}`;
  }

  return `${onboardingStepPath(session.current_step)}?${q.toString()}`;
}

export function resolveOnboardingResumeStepLabel(
  session: IncompleteOnboardingSession
): string {
  if (
    session.payment_status === 'complete' &&
    (session.current_step === 'payment' || session.current_step === 'children')
  ) {
    return 'child profiles';
  }
  if (session.current_step === 'payment' && session.payment_status !== 'complete') {
    return 'payment confirmation';
  }
  const labels: Record<OnboardingStep, string> = {
    account: 'your account details',
    children: 'child packages',
    payment: 'payment',
    setup: 'child profiles',
    reports: 'school reports',
    complete: 'enrolment',
  };
  return labels[session.current_step] ?? 'enrolment';
}

export function packageForSlot(
  session: OnboardingSessionRow,
  slot: number
): PackageSelectionSlot | undefined {
  return session.package_selections.find((p) => p.learner_slot === slot);
}

export function allSetupSlotsFilled(session: OnboardingSessionRow): boolean {
  const count = session.child_count ?? 0;
  if (count < 1) return false;
  const filled = session.package_selections.filter((p) => p.learner_id).length;
  return filled >= count;
}

export function completedSlots(session: OnboardingSessionRow): number[] {
  return session.package_selections
    .filter((p) => p.learner_id)
    .map((p) => p.learner_slot);
}
