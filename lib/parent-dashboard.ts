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

// #region agent log
function debugSchedulesLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  fetch('http://127.0.0.1:7402/ingest/d851579b-cb6d-4eb5-ad9a-a6e345f4c63d', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '5d33ef',
    },
    body: JSON.stringify({
      sessionId: '5d33ef',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

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

  const enrollmentsQuery =
    learnerIds.length > 0
      ? supabase
          .from('class_enrollments')
          .select('learner_id, class_id')
          .in('learner_id', learnerIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [], error: null });

  const legacyClassesQuery =
    learnerIds.length > 0
      ? supabase
          .from('classes')
          .select('*, tutors (first_name, last_name)')
          .in('learner_id', learnerIds)
      : Promise.resolve({ data: [], error: null });

  const [profileRes, appsRes, subsRes, paymentsRes, enrollmentsRes, legacyClassesRes, packagesRes] =
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
      enrollmentsQuery,
      legacyClassesQuery,
      supabase.from('packages').select('*').eq('is_active', true),
    ]);

  const enrollmentLinks = enrollmentsRes.data ?? [];
  const enrolledClassIds = [
    ...new Set(enrollmentLinks.map((r) => r.class_id as string)),
  ];

  let classCatalogRows: (ClassRow & {
    tutors?: { first_name: string; last_name: string } | null;
  })[] = [];

  if (enrolledClassIds.length > 0) {
    const { data: catalog, error: catalogError } = await supabase
      .from('classes')
      .select('*, tutors ( first_name, last_name )')
      .in('id', enrolledClassIds);

    classCatalogRows = (catalog ?? []) as typeof classCatalogRows;

    // #region agent log
    debugSchedulesLog('A', 'parent-dashboard.ts:classes', 'class catalog for enrollments', {
      enrollmentLinkCount: enrollmentLinks.length,
      enrolledClassIds,
      catalogRowCount: classCatalogRows.length,
      catalogError: catalogError?.message ?? null,
      missingClassIds: enrolledClassIds.filter(
        (id) => !classCatalogRows.some((c) => c.id === id)
      ),
    });
    // #endregion
  }

  const catalogById = new Map(classCatalogRows.map((c) => [c.id, c]));

  const enrollmentClasses = enrollmentLinks.flatMap((link) => {
    const cls = catalogById.get(link.class_id as string);
    if (!cls) return [];
    return [
      {
        ...cls,
        learner_id: link.learner_id as string,
        tutors: cls.tutors ?? null,
      },
    ];
  });

  const legacyClasses = ((legacyClassesRes.data ?? []) as ClassRow[]).map(
    (cls) => ({
      ...cls,
      tutors:
        (cls as ClassRow & { tutors?: { first_name: string; last_name: string } })
          .tutors ?? null,
    })
  );

  const seenClassKeys = new Set(
    enrollmentClasses.map((c) => `${c.learner_id}:${c.id}`)
  );
  const mergedClasses = [
    ...enrollmentClasses,
    ...legacyClasses.filter(
      (c) => c.learner_id && !seenClassKeys.has(`${c.learner_id}:${c.id}`)
    ),
  ];

  let sessions: DashboardSession['sessions'] = [];
  if (learnerIds.length > 0) {
    const classIds = mergedClasses.map((c) => c.id);
    if (classIds.length > 0) {
      const { data: sessionRows } = await supabase
        .from('class_sessions')
        .select('*, classes (*, tutors (first_name, last_name))')
        .in('class_id', classIds)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(200);

      sessions = (sessionRows ?? []) as DashboardSession['sessions'];

      // #region agent log
      debugSchedulesLog('B', 'parent-dashboard.ts:sessions', 'sessions query result', {
        classIdCount: classIds.length,
        sessionRowCount: sessionRows?.length ?? 0,
        sessionsWithNullClass: (sessionRows ?? []).filter((s) => !s.classes).length,
        mergedClassCount: mergedClasses.length,
      });
      // #endregion
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
      .in('ocr_status', ['complete', 'failed'])
      .neq('file_type', 'manual')
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
    classes: mergedClasses as DashboardSession['classes'],
    sessions,
    packages,
    pendingReportConfirmations,
  };
}
