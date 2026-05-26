import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server';
import {
  loadOnboardingSession,
  isValidSessionId,
  type OnboardingSessionRow,
} from '@/lib/onboarding/sessions';

export async function getAuthContext(): Promise<{
  userId: string | null;
  email: string | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return {
      userId: user?.id ?? null,
      email: user?.email ?? null,
    };
  } catch {
    return { userId: null, email: null };
  }
}

export type SessionAccessDenied = {
  ok: false;
  error: string;
  status: 401 | 403 | 404;
};

/**
 * Load and authorise an onboarding session.
 *
 * Security model: the session ID is a UUID generated server-side and stored
 * in localStorage + the URL. Possession of the session ID is sufficient proof
 * of ownership for the onboarding flow. We do NOT require a valid auth cookie
 * here because:
 *   1. signInWithPassword happens on the client and the cookie may not have
 *      propagated to the server context by the time the next server action runs.
 *   2. The onboarding session itself was created with the user's email and
 *      user_id — that binding already happened at account creation time.
 *
 * We still read the auth context so downstream code can use it (e.g. to link
 * user_id if it's missing), but we do not gate access on it.
 */
export async function loadSessionForRequest(
  sessionId: string
): Promise<
  | {
      ok: true;
      session: OnboardingSessionRow;
      auth: { userId: string | null; email: string | null };
    }
  | SessionAccessDenied
> {
  if (!isValidSessionId(sessionId)) {
    return { ok: false, error: 'Invalid session id', status: 404 };
  }

  const service = createServiceClient();
  const session = await loadOnboardingSession(service, sessionId);

  if (!session) {
    return { ok: false, error: 'Session not found', status: 404 };
  }

  // Read auth context for downstream use — but do not gate access on it
  const auth = await getAuthContext();

  return { ok: true, session, auth };
}

/** HTTP route adapter — maps errors to JSON responses. */
export async function loadSessionForRequestHttp(
  sessionId: string
): Promise<
  | {
      ok: true;
      session: OnboardingSessionRow;
      auth: { userId: string | null; email: string | null };
    }
  | { ok: false; response: NextResponse }
> {
  const loaded = await loadSessionForRequest(sessionId);
  if (!loaded.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: loaded.error },
        { status: loaded.status }
      ),
    };
  }
  return loaded;
}
