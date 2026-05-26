/** Canonical entry point for new parent enrolment. */
export const ONBOARDING_ACCOUNT_PATH = '/onboarding/account' as const;

export const ONBOARDING_STEPS = [
  'account',
  'children',
  'payment',
  'setup',
  'reports',
  'complete',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const STEP_PATHS: Record<OnboardingStep, string> = {
  account: '/onboarding/account',
  children: '/onboarding/children',
  payment: '/onboarding/payment',
  setup: '/onboarding/setup',
  reports: '/onboarding/reports',
  complete: '/onboarding/complete',
};

export function onboardingStepPath(step: OnboardingStep): string {
  return STEP_PATHS[step];
}

export const PROGRESS_STEPS: OnboardingStep[] = [
  'account',
  'children',
  'payment',
  'setup',
  'reports',
  'complete',
];

export const LOCAL_STORAGE_SESSION_KEY = 'onboarding_session_id';
