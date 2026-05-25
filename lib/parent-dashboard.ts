import { ensureParentRowFromAuthUser } from '@/lib/parent-profile';
import {
  createServerSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server';
import type {
  ApplicationRow,
  ClassRow,
  ClassSessionRow,
  LearnerRow,
  PackageRow,
  ParentRow,
  PaymentRow,
  ProfileRow,
  SubscriptionRow,
} from '@/lib/types/database';
import type { DashboardSession } from '@/lib/parent-dashboard-types';

export type { DashboardSession } from '@/lib/parent-dashboard-types';
export { formatCents, subscriptionDisplayStatus } from '@/lib/parent-dashboard-utils';

/** Link parent row created at payment to auth user created at application. */
async function linkParentByEmail(profileId: string, email: string): Promise<boolean> {
  try {
    const service = createServiceClient();
    const normalized = email.trim().toLowerCase();
    const { data: parent } = await service
      .from('parents')
      .select('id, profile_id')
      .eq('email', normalized)
      .maybeSingle();

    if (!parent || parent.profile_id) return false;

    const { error } = await service
      .from('parents')
      .update({ profile_id: profileId })
      .eq('id', parent.id);

    return !error;
  } catch {
    return false;
  }
}

export async function getParentDashboard(): Promise<DashboardSession | null> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle();

  if ((!parent || parentError) && user.email) {
    const linked = await linkParentByEmail(user.id, user.email);
    if (linked) {
      const retry = await supabase
        .from('parents')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();
      parent = retry.data;
      parentError = retry.error;
    }
  }

  if ((!parent || parentError) && user.email) {
    const ensured = await ensureParentRowFromAuthUser(user.id, user.email);
    if ('parentId' in ensured) {
      const retry = await supabase
        .from('parents')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();
      parent = retry.data;
      parentError = retry.error;
    }
  }

  if (parentError) {
    console.error('getParentDashboard parents query:', parentError);
    return null;
  }

  if (!parent) return null;

  const parentRow = parent as ParentRow;

  const learnersRes = await supabase
    .from('learners')
    .select('*')
    .eq('parent_id', parentRow.id);

  const learnerIds = (learnersRes.data ?? []).map((l) => (l as LearnerRow).id);

  const classesQuery =
    learnerIds.length > 0
      ? supabase
          .from('classes')
          .select('*, tutors (first_name, last_name)')
          .in('learner_id', learnerIds)
      : Promise.resolve({ data: [], error: null });

  const [profileRes, appsRes, subsRes, paymentsRes, classesRes, packagesRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('applications')
        .select('*')
        .eq('parent_id', parentRow.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('parent_id', parentRow.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false }),
      classesQuery,
      supabase.from('packages').select('*').eq('is_active', true),
    ]);

  let sessions: DashboardSession['sessions'] = [];
  if (learnerIds.length > 0) {
    const classIds = (classesRes.data ?? []).map((c) => (c as ClassRow).id);
    if (classIds.length > 0) {
      const { data: sessionRows } = await supabase
        .from('class_sessions')
        .select('*, classes (*, tutors (first_name, last_name))')
        .in('class_id', classIds)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);

      sessions = (sessionRows ?? []) as DashboardSession['sessions'];
    }
  }

  const packages = (packagesRes.data ?? []) as PackageRow[];
  const subs = (subsRes.data ?? []) as SubscriptionRow[];

  let pendingReportConfirmations: DashboardSession['pendingReportConfirmations'] =
    [];
  if (learnerIds.length > 0) {
    const { data: pendingReports } = await supabase
      .from('learner_reports')
      .select('id, ocr_status, learner_id, learners ( first_name, last_name )')
      .in('learner_id', learnerIds)
      .eq('confirmed', false)
      .in('ocr_status', ['complete', 'failed', 'processing', 'pending'])
      .order('uploaded_at', { ascending: false });

    pendingReportConfirmations = (pendingReports ?? []).map((r) => {
      const l = r.learners as { first_name: string; last_name: string } | null;
      return {
        reportId: r.id as string,
        learnerId: r.learner_id as string,
        learnerName: l ? `${l.first_name} ${l.last_name}` : 'Learner',
        ocrStatus: r.ocr_status as string,
      };
    });
  }

  return {
    profile: (profileRes.data as ProfileRow | null) ?? null,
    parent: parentRow,
    learners: (learnersRes.data ?? []) as LearnerRow[],
    applications: (appsRes.data ?? []) as ApplicationRow[],
    subscriptions: subs.map((s) => ({
      ...s,
      package: packages.find((p) => p.id === s.package_id) ?? null,
    })),
    payments: ((paymentsRes.data ?? []) as PaymentRow[]).filter(
      (p) =>
        p.parent_id === parentRow.id ||
        learnerIds.includes(p.learner_id ?? '')
    ),
    classes: (classesRes.data ?? []) as DashboardSession['classes'],
    sessions,
    packages,
    pendingReportConfirmations,
  };
}
