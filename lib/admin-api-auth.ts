import { cookies } from 'next/headers';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-token';
import {
  createServerSupabaseClient,
  createServiceClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types/database';

export function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('secret') === secret;
}

/** Cookie-based admin session (legacy dashboard login). */
export async function isAdminCookieAuthed(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminSessionToken(token);
}

/** Supabase Auth user with profiles.role = admin. */
export async function getSupabaseAuthRole(): Promise<{
  userId: string | null;
  role: UserRole | null;
}> {
  if (!isSupabaseConfigured()) {
    return { userId: null, role: null };
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { userId: null, role: null };

    const service = createServiceClient();
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      userId: user.id,
      role: (profile?.role as UserRole | undefined) ?? null,
    };
  } catch {
    return { userId: null, role: null };
  }
}

/** Admin API routes: cron secret, admin cookie, or Supabase admin profile. */
export async function authorizeAdminRequest(
  request: Request
): Promise<{ ok: true } | { ok: false; status: 401 }> {
  if (authorizeCron(request)) return { ok: true };
  if (await isAdminCookieAuthed()) return { ok: true };

  const { role } = await getSupabaseAuthRole();
  if (role === 'admin') return { ok: true };

  return { ok: false, status: 401 };
}

export async function getTutorIdForAuthUser(): Promise<string | null> {
  const { userId, role } = await getSupabaseAuthRole();
  if (!userId || role !== 'tutor') return null;

  const service = createServiceClient();
  const { data } = await service
    .from('tutors')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  return data?.id ?? null;
}
