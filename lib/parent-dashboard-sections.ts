import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getParentDashboard } from '@/lib/parent-dashboard';
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
  TutorRow,
} from '@/lib/types/database';
import type { DashboardSession } from '@/lib/parent-dashboard-types';

export type ParentContext = {
  parent: ParentRow;
  profile: ProfileRow | null;
  learnerIds: string[];
};

export async function resolveParentContext(
  userId: string
): Promise<ParentContext | null> {
  const supabase = createServerSupabaseClient();

  const { data: parent } = await supabase
    .from('parents')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!parent) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const { data: learners } = await supabase
    .from('learners')
    .select('id')
    .eq('parent_id', parent.id);

  return {
    parent: parent as ParentRow,
    profile: (profile as ProfileRow | null) ?? null,
    learnerIds: (learners ?? []).map((l) => l.id as string),
  };
}

export type SidebarProfile = {
  fullName: string | null;
  email: string | null;
};

export async function loadDashboardShellProfile(
  userId: string
): Promise<SidebarProfile | null> {
  const ctx = await resolveParentContext(userId);
  if (!ctx) return null;

  const name =
    ctx.profile?.full_name?.trim() ||
    `${ctx.parent.first_name} ${ctx.parent.last_name}`.trim();

  return {
    fullName: name || null,
    email: ctx.profile?.email ?? ctx.parent.email ?? null,
  };
}

export type ChildrenPageLearner = LearnerRow & {
  subscriptions: Pick<
    SubscriptionRow,
    'id' | 'status' | 'package_id' | 'next_billing_date'
  >[];
  applications: Pick<ApplicationRow, 'id' | 'status'>[];
  reportCount: number;
  pendingReportCount: number;
};

export async function getParentChildrenPage(
  ctx: ParentContext
): Promise<ChildrenPageLearner[]> {
  const supabase = createServerSupabaseClient();

  const { data: learners } = await supabase
    .from('learners')
    .select('*')
    .eq('parent_id', ctx.parent.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (!learners?.length) return [];

  const learnerIds = learners.map((l) => l.id);

  const [subsRes, appsRes, reportsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, learner_id, status, package_id, next_billing_date')
      .in('learner_id', learnerIds),
    supabase
      .from('applications')
      .select('id, learner_id, status')
      .in('learner_id', learnerIds),
    supabase
      .from('learner_reports')
      .select('id, learner_id, confirmed, ocr_status')
      .in('learner_id', learnerIds),
  ]);

  const subsByLearner = new Map<string, ChildrenPageLearner['subscriptions']>();
  for (const s of subsRes.data ?? []) {
    const lid = s.learner_id as string;
    const list = subsByLearner.get(lid) ?? [];
    list.push({
      id: s.id as string,
      status: s.status as SubscriptionRow['status'],
      package_id: s.package_id as string,
      next_billing_date: s.next_billing_date as string | null,
    });
    subsByLearner.set(lid, list);
  }

  const appsByLearner = new Map<string, ChildrenPageLearner['applications']>();
  for (const a of appsRes.data ?? []) {
    const lid = a.learner_id as string;
    if (!lid) continue;
    const list = appsByLearner.get(lid) ?? [];
    list.push({
      id: a.id as string,
      status: a.status as ApplicationRow['status'],
    });
    appsByLearner.set(lid, list);
  }

  const reportStats = new Map<
    string,
    { total: number; pending: number }
  >();
  for (const r of reportsRes.data ?? []) {
    const lid = r.learner_id as string;
    const cur = reportStats.get(lid) ?? { total: 0, pending: 0 };
    cur.total += 1;
    if (!r.confirmed) cur.pending += 1;
    reportStats.set(lid, cur);
  }

  return (learners as LearnerRow[]).map((learner) => {
    const stats = reportStats.get(learner.id) ?? { total: 0, pending: 0 };
    return {
      ...learner,
      subscriptions: subsByLearner.get(learner.id) ?? [],
      applications: appsByLearner.get(learner.id) ?? [],
      reportCount: stats.total,
      pendingReportCount: stats.pending,
    };
  });
}

export type ReportListItem = {
  id: string;
  file_url: string;
  file_type: string;
  term: string;
  academic_year: number;
  confirmed: boolean;
  uploaded_at: string;
  learner: Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'>;
  extractionCount: number;
  needsReviewCount: number;
};

export async function getParentReportsPage(
  ctx: ParentContext
): Promise<ReportListItem[]> {
  if (ctx.learnerIds.length === 0) return [];

  const supabase = createServerSupabaseClient();

  const { data: reports } = await supabase
    .from('learner_reports')
    .select(
      `
      id, file_url, file_type, term, academic_year,
      confirmed, uploaded_at, learner_id,
      learners ( id, first_name, last_name, grade ),
      report_extractions ( id, needs_review )
    `
    )
    .in('learner_id', ctx.learnerIds)
    .order('uploaded_at', { ascending: false });

  return (reports ?? []).map((r) => {
    const extractions = (r.report_extractions ?? []) as {
      id: string;
      needs_review: boolean;
    }[];
    const learner = r.learners as Pick<
      LearnerRow,
      'id' | 'first_name' | 'last_name' | 'grade'
    > | null;
    return {
      id: r.id as string,
      file_url: r.file_url as string,
      file_type: r.file_type as string,
      term: r.term as string,
      academic_year: r.academic_year as number,
      confirmed: r.confirmed as boolean,
      uploaded_at: r.uploaded_at as string,
      learner: learner ?? {
        id: r.learner_id as string,
        first_name: 'Learner',
        last_name: '',
        grade: 0,
      },
      extractionCount: extractions.length,
      needsReviewCount: extractions.filter((e) => e.needs_review).length,
    };
  });
}

export type ScheduleListItem =
  | {
      kind: 'session';
      id: string;
      scheduled_at: string;
      cancelled: boolean;
      learner: Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'>;
      classInfo: {
        subject: string;
        grade: number;
        meet_link: string | null;
        tutorName: string | null;
      };
    }
  | {
      kind: 'legacy';
      id: string;
      learner: Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'>;
      classInfo: {
        subject: string;
        grade: number;
        schedule: string | null;
        meet_link: string | null;
        tutorName: string | null;
      };
    };

// #region agent log
function debugSchedulesPageLog(
  hypothesisId: string,
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
      location: 'parent-dashboard-sections.ts:getParentSchedulesPage',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

export async function getParentSchedulesPage(
  data: DashboardSession,
  learnerIdFilter?: string
): Promise<ScheduleListItem[]> {
  const learners = learnerIdFilter
    ? data.learners.filter((l) => l.id === learnerIdFilter)
    : data.learners;

  const learnerMap = new Map(learners.map((l) => [l.id, l]));
  const items: ScheduleListItem[] = [];

  const classIds = new Set(
    data.classes
      .filter((c) => learnerMap.has(c.learner_id ?? ''))
      .map((c) => c.id)
  );

  /** Group classes have null learner_id on `classes`; map from flattened dashboard rows. */
  const learnerIdByClassId = new Map(
    data.classes
      .filter((c) => c.learner_id && learnerMap.has(c.learner_id))
      .map((c) => [c.id, c.learner_id as string])
  );

  for (const session of data.sessions) {
    const cls = session.classes;
    if (!cls) continue;

    const sessionLearnerId =
      cls.learner_id ?? learnerIdByClassId.get(session.class_id);
    if (!sessionLearnerId || !learnerMap.has(sessionLearnerId)) continue;
    if (!classIds.has(session.class_id)) continue;

    const learner = learnerMap.get(sessionLearnerId)!;
    const tutor = cls.tutors;
    items.push({
      kind: 'session',
      id: session.id,
      scheduled_at: session.scheduled_at,
      cancelled: session.cancelled,
      learner: {
        id: learner.id,
        first_name: learner.first_name,
        last_name: learner.last_name,
        grade: learner.grade,
      },
      classInfo: {
        subject: cls.subject,
        grade: cls.grade,
        meet_link: cls.meet_link,
        tutorName: tutor
          ? `${tutor.first_name} ${tutor.last_name}`
          : null,
      },
    });
  }

  for (const cls of data.classes) {
    if (!cls.learner_id || !learnerMap.has(cls.learner_id)) continue;
    const hasSession = data.sessions.some((s) => s.class_id === cls.id);
    if (hasSession) continue;

    const learner = learnerMap.get(cls.learner_id)!;
    const tutor = cls.tutors;
    items.push({
      kind: 'legacy',
      id: cls.id,
      learner: {
        id: learner.id,
        first_name: learner.first_name,
        last_name: learner.last_name,
        grade: learner.grade,
      },
      classInfo: {
        subject: cls.subject,
        grade: cls.grade,
        schedule: cls.schedule,
        meet_link: cls.meet_link,
        tutorName: tutor ? `${tutor.first_name} ${tutor.last_name}` : null,
      },
    });
  }

  items.sort((a, b) => {
    if (a.kind === 'session' && b.kind === 'session') {
      return (
        new Date(a.scheduled_at).getTime() -
        new Date(b.scheduled_at).getTime()
      );
    }
    if (a.kind === 'session') return -1;
    if (b.kind === 'session') return 1;
    return 0;
  });

  // #region agent log
  debugSchedulesPageLog('C', 'schedule page assembly', {
    learnerFilter: learnerIdFilter ?? null,
    learnerCount: learners.length,
    classCount: data.classes.length,
    sessionCount: data.sessions.length,
    itemCount: items.length,
    classIdsSize: classIds.size,
  });
  // #endregion

  return items;
}

export type SubscriptionsPageData = {
  subscriptions: (SubscriptionRow & {
    package: PackageRow | null;
    learner: Pick<
      LearnerRow,
      'id' | 'first_name' | 'last_name' | 'grade' | 'school_name'
    > | null;
    payments: PaymentRow[];
  })[];
  packages: PackageRow[];
};

export async function getParentSubscriptionsPage(
  data: DashboardSession
): Promise<SubscriptionsPageData> {
  const paymentsByLearner = new Map<string, PaymentRow[]>();
  const paymentsByParent = data.payments.filter(
    (p) => p.parent_id === data.parent.id
  );

  for (const p of paymentsByParent) {
    if (p.learner_id) {
      const list = paymentsByLearner.get(p.learner_id) ?? [];
      list.push(p);
      paymentsByLearner.set(p.learner_id, list);
    }
  }

  const subscriptions = data.subscriptions.map((sub) => ({
    ...sub,
    package: sub.package ?? null,
    learner:
      data.learners.find((l) => l.id === sub.learner_id) ?? null,
    payments: (paymentsByLearner.get(sub.learner_id) ?? []).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  }));

  return {
    subscriptions,
    packages: data.packages,
  };
}

export { getParentDashboard };
