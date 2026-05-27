import { brand } from '@/lib/site-config';

/** Public app base URL (PayFast return/cancel links). */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    brand.siteUrl.replace(/\/$/, '')
  );
}

export type BuildPayfastReturnUrlsInput = {
  applicationId: string;
  packageId: string;
  learnerFirstName: string;
  /** When payment started from parent dashboard (add child / renewal). */
  flow?: 'dashboard';
  /** Post-payment path (must start with /). */
  redirect?: string;
};

/** PayFast return/cancel for parent onboarding (combined multi-child payment). */
export function buildOnboardingPayfastReturnUrls(sessionId: string): {
  returnUrl: string;
  cancelUrl: string;
} {
  const base = appBaseUrl();
  const returnUrl = new URL('/onboarding/setup', base);
  returnUrl.searchParams.set('status', 'success');
  returnUrl.searchParams.set('session_id', sessionId);

  const cancelUrl = new URL('/onboarding/payment', base);
  cancelUrl.searchParams.set('status', 'cancelled');
  cancelUrl.searchParams.set('session_id', sessionId);

  return {
    returnUrl: returnUrl.toString(),
    cancelUrl: cancelUrl.toString(),
  };
}

export function buildPayfastReturnUrls(input: BuildPayfastReturnUrlsInput): {
  returnUrl: string;
  cancelUrl: string;
} {
  const base = appBaseUrl();
  const ref = input.applicationId.slice(0, 8);
  const learnerName = input.learnerFirstName.trim();

  const returnUrl = new URL('/payment/return', base);
  returnUrl.searchParams.set('status', 'success');
  returnUrl.searchParams.set('application_id', input.applicationId);
  returnUrl.searchParams.set('package', input.packageId);
  returnUrl.searchParams.set('learner_name', learnerName);
  returnUrl.searchParams.set('ref', ref);
  if (input.flow === 'dashboard') {
    returnUrl.searchParams.set('flow', 'dashboard');
  }
  const redirectPath =
    input.redirect ??
    (input.flow === 'dashboard' ? '/dashboard/children' : '/dashboard');
  if (redirectPath.startsWith('/')) {
    returnUrl.searchParams.set('redirect', redirectPath);
  }

  const cancelUrl = new URL('/payment/return', base);
  cancelUrl.searchParams.set('status', 'cancelled');
  cancelUrl.searchParams.set('application_id', input.applicationId);
  cancelUrl.searchParams.set('learner_name', learnerName);
  cancelUrl.searchParams.set('ref', ref);
  if (input.flow === 'dashboard') {
    cancelUrl.searchParams.set('flow', 'dashboard');
    cancelUrl.searchParams.set('redirect', '/dashboard/children/add');
  }

  return {
    returnUrl: returnUrl.toString(),
    cancelUrl: cancelUrl.toString(),
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_PACKAGES = new Set(['package-a', 'package-b']);

export type PaymentReturnView =
  | {
      kind: 'success';
      applicationId: string;
      packageId: string;
      learnerName: string;
      ref: string;
      flow?: 'dashboard';
      redirect?: string;
    }
  | {
      kind: 'cancelled';
      applicationId: string;
      learnerName: string;
      ref: string;
      flow?: 'dashboard';
      redirect?: string;
    }
  | { kind: 'error' };

function safeRedirectPath(raw: string): string | undefined {
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return undefined;
  return path;
}

export function parsePaymentReturnParams(
  searchParams: Record<string, string | string[] | undefined>
): PaymentReturnView {
  const get = (key: string) => {
    const v = searchParams[key];
    if (Array.isArray(v)) return v[0]?.trim() ?? '';
    return typeof v === 'string' ? v.trim() : '';
  };

  const status = get('status');
  const applicationId = get('application_id');
  const learnerName = get('learner_name');
  const ref = get('ref') || applicationId.slice(0, 8);
  const flow = get('flow') === 'dashboard' ? 'dashboard' : undefined;
  const redirectRaw = get('redirect');
  const redirect = redirectRaw ? safeRedirectPath(redirectRaw) : undefined;

  if (status !== 'success' && status !== 'cancelled') {
    return { kind: 'error' };
  }

  if (!applicationId || !UUID_RE.test(applicationId)) {
    return { kind: 'error' };
  }

  if (!learnerName) {
    return { kind: 'error' };
  }

  if (status === 'cancelled') {
    return {
      kind: 'cancelled',
      applicationId,
      learnerName,
      ref: ref || applicationId.slice(0, 8),
      flow,
      redirect:
        redirect ??
        (flow === 'dashboard' ? '/dashboard/children/add' : undefined),
    };
  }

  const packageId = get('package');
  if (!packageId || !VALID_PACKAGES.has(packageId)) {
    return { kind: 'error' };
  }

  return {
    kind: 'success',
    applicationId,
    packageId,
    learnerName,
    ref: ref || applicationId.slice(0, 8),
    flow,
    redirect:
      redirect ?? (flow === 'dashboard' ? '/dashboard/children' : undefined),
  };
}
