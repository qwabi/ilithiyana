'use server';

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { getTutorByEmail, submitTutorTimesheet } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';

const PARENT_COOKIE = 'ilithiyana_parent_email';
const TUTOR_COOKIE = 'ilithiyana_tutor_id';
const PORTAL_MAX_AGE = 60 * 60 * 24;

function portalSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'dev-secret-change-me';
}

function signValue(value: string): string {
  const expires = Date.now() + PORTAL_MAX_AGE * 1000;
  const payload = `${value}:${expires}`;
  const sig = createHmac('sha256', portalSecret()).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

function verifySignedValue(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = createHmac('sha256', portalSecret())
    .update(payload)
    .digest('hex');

  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  const [value, expiresStr] = payload.split(':');
  const expires = Number(expiresStr);
  if (!expires || Date.now() > expires) return null;

  return value;
}

/** @deprecated Parent portal uses Supabase Auth at /login and /dashboard */
export async function loginParentPortal(): Promise<{
  ok: false;
  error: string;
}> {
  return {
    ok: false,
    error: 'Please sign in at /login with your email and password.',
  };
}

export async function logoutParentPortal() {
  cookies().delete(PARENT_COOKIE);
}

export async function getParentPortalSession() {
  return null;
}

export async function loginTutorPortal(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Portal is not available right now.' };
  }

  try {
    const tutor = await getTutorByEmail(email);
    if (!tutor) {
      return {
        ok: false,
        error:
          'No tutor profile found for this email. Contact admin if you need access.',
      };
    }

    const token = signValue(tutor.id);
    cookies().set(TUTOR_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PORTAL_MAX_AGE,
    });

    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not verify your email. Please try again.' };
  }
}

export async function logoutTutorPortal() {
  cookies().delete(TUTOR_COOKIE);
}

export async function getTutorPortalSession() {
  const tutorId = verifySignedValue(cookies().get(TUTOR_COOKIE)?.value);
  if (!tutorId || !isSupabaseConfigured()) return null;

  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .eq('id', tutorId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function submitTutorTimesheetAction(input: {
  monthPeriod: string;
  sessionsCount: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const tutorId = verifySignedValue(cookies().get(TUTOR_COOKIE)?.value);
  if (!tutorId) {
    return { ok: false, error: 'Please sign in again.' };
  }

  if (!input.monthPeriod || input.sessionsCount < 1) {
    return { ok: false, error: 'Enter a valid month and session count.' };
  }

  try {
    await submitTutorTimesheet({
      tutorId,
      monthPeriod: input.monthPeriod,
      sessionsCount: input.sessionsCount,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not submit timesheet',
    };
  }
}
