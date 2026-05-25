import { getParentDashboard } from '@/lib/parent-dashboard';
import { ensureParentRowFromAuthUser } from '@/lib/parent-profile';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types/database';

export type ParentDashboardPageState =
  | { status: 'unauthenticated' }
  | { status: 'ok'; data: NonNullable<Awaited<ReturnType<typeof getParentDashboard>>> }
  | {
      status: 'pending';
      email: string | null;
      reason: 'no_parent' | 'wrong_role' | 'error';
      message?: string;
    };

export async function loadParentDashboardPage(): Promise<ParentDashboardPageState> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'unauthenticated' };
  }

  const data = await getParentDashboard();
  if (data) {
    return { status: 'ok', data };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('loadParentDashboardPage profile:', profileError);
    return {
      status: 'pending',
      email: user.email ?? null,
      reason: 'error',
      message: profileError.message,
    };
  }

  const role = profile?.role as UserRole | undefined;

  if (profile && role && role !== 'parent') {
    return {
      status: 'pending',
      email: user.email ?? null,
      reason: 'wrong_role',
    };
  }

  if (user.email) {
    const ensured = await ensureParentRowFromAuthUser(user.id, user.email);
    if ('parentId' in ensured) {
      const retry = await getParentDashboard();
      if (retry) {
        return { status: 'ok', data: retry };
      }
    } else if (ensured.error === 'Account is not a parent role') {
      return {
        status: 'pending',
        email: user.email,
        reason: 'wrong_role',
      };
    } else {
      console.error('loadParentDashboardPage ensure:', ensured.error);
    }
  }

  return {
    status: 'pending',
    email: user.email ?? null,
    reason: 'no_parent',
  };
}
