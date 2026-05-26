import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getParentDashboard } from '@/lib/parent-dashboard';
import { formatWeeklySchedule } from '@/lib/schedules/format';
import type {
  ApplicationRow,
  ClassBand,
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

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
    const learner = relationOne(
      r.learners as
        | Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'>
        | Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'>[]
        | null
    );
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

type ScheduleClassInfo = {
  subject: string;
  grade: number;
  band: ClassBand | null;
  bandLabel: string | null;
  weeklySchedule: string | null;
  meet_link: string | null;
  tutorName: string | null;
};

export type ScheduleListItem =
  | {
      kind: 'session';
      id: string;
      scheduled_at: string;
      cancelled: boolean;
      learner: Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'>;
      classInfo: ScheduleClassInfo;
    }
  | {
      kind: 'legacy';
      id: string;
      learner: Pick<LearnerRow, 'id' | 'first_name' | 'last_name' | 'grade'>;
      classInfo: ScheduleClassInfo;
    };

function scheduleClassInfo(
  cls: ClassRow & {
    tutors?: Pick<TutorRow, 'first_name' | 'last_name'> | null;
  }
): ScheduleClassInfo {
  const tutor = cls.tutors;
  return {
    subject: cls.subject,
    grade: cls.grade,
    band: (cls.band as ClassBand | null) ?? null,
    bandLabel: (cls.band_label as string | null) ?? null,
    weeklySchedule: formatWeeklySchedule(
      cls.schedule_day,
      cls.schedule_time,
      cls.schedule
    ),
    meet_link: cls.meet_link,
    tutorName: tutor ? `${tutor.first_name} ${tutor.last_name}` : null,
  };
}

/** Parent schedule from class_enrollments → classes (see getParentDashboard). */
export async function getParentSchedulesPage(
  data: DashboardSession,
  learnerIdFilter?: string
): Promise<ScheduleListItem[]> {
  const learners = learnerIdFilter
    ? data.learners.filter((l) => l.id === learnerIdFilter)
    : data.learners;

  const learnerMap = new Map(learners.map((l) => [l.id, l]));
  const items: ScheduleListItem[] = [];

  const enrolledClasses = data.classes.filter(
    (c) => c.learner_id && learnerMap.has(c.learner_id)
  );
  const enrolledClassIds = new Set(enrolledClasses.map((c) => c.id));
  const classById = new Map(enrolledClasses.map((c) => [c.id, c]));

  for (const session of data.sessions) {
    if (!enrolledClassIds.has(session.class_id)) continue;

    const enrolled = classById.get(session.class_id);
    if (!enrolled?.learner_id) continue;

    const learner = learnerMap.get(enrolled.learner_id);
    if (!learner) continue;

    const cls = session.classes ?? enrolled;
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
      classInfo: scheduleClassInfo(cls),
    });
  }

  for (const cls of enrolledClasses) {
    const hasSession = data.sessions.some((s) => s.class_id === cls.id);
    if (hasSession) continue;

    const learner = learnerMap.get(cls.learner_id!);
    if (!learner) continue;

    items.push({
      kind: 'legacy',
      id: `${cls.learner_id}:${cls.id}`,
      learner: {
        id: learner.id,
        first_name: learner.first_name,
        last_name: learner.last_name,
        grade: learner.grade,
      },
      classInfo: scheduleClassInfo(cls),
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
