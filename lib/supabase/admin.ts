import { createAnonClient, createServiceClient } from '@/lib/supabase/server';
import type {
  ApplicationFilters,
  ApplicationRow,
  ApplicationStatus,
  ApplicationWithRelations,
  ClassBand,
  ClassRow,
  ContactMessageRow,
  GroupClassWithCount,
  LearnerReportRow,
  LearnerRow,
  ParentRow,
  PaymentRow,
  SubmitApplicationRpcArgs,
  SubmitContactMessageRpcArgs,
  SubscriptionFilters,
  SubscriptionRow,
  SubscriptionWithLearner,
  TimesheetFilters,
  TutorDocumentRow,
  TutorProfileRow,
  TutorRow,
  TutorTimesheetRow,
  TutorTimesheetWithTutor,
  TutorVettingStatus,
} from '@/lib/types/database';
import { packageAmountCents } from '@/lib/payfast';

const APPLICATION_SELECT = `
  *,
  parents (*),
  learners (*)
`;

function applyApplicationFilters<
  Q extends {
    eq: (col: string, val: string | number) => Q;
    gte: (col: string, val: string) => Q;
    lte: (col: string, val: string) => Q;
    contains: (col: string, val: string[]) => Q;
    order: (col: string, opts: { ascending: boolean }) => Q;
    range: (from: number, to: number) => Q;
  },
>(query: Q, filters?: ApplicationFilters): Q {
  if (!filters) return query;

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.province) query = query.eq('province', filters.province);
  if (filters.packageId) query = query.eq('package_id', filters.packageId);
  if (filters.subject) query = query.contains('subjects', [filters.subject]);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate);

  query = query.order('created_at', { ascending: false });

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  return query;
}

/** Admin: list applications with parent/learner joins and optional filters. */
export async function getApplications(filters?: ApplicationFilters) {
  const supabase = createServiceClient();
  const resolved: ApplicationFilters = { limit: 50, offset: 0, ...filters };

  let query = supabase.from('applications').select(APPLICATION_SELECT);
  query = applyApplicationFilters(query, resolved);

  const { data, error } = await query;

  if (error) throw error;

  let rows = (data ?? []) as ApplicationWithRelations[];

  if (filters?.grade != null) {
    rows = rows.filter((row) => {
      const fromLearner = row.learners?.grade;
      const fromSnapshot = Number(
        (row.learner_snapshot as { grade?: number })?.grade
      );
      const grade = fromLearner ?? fromSnapshot;
      return grade === filters.grade;
    });
  }

  return rows;
}

/** Admin: single application with relations. */
export async function getApplicationById(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as ApplicationWithRelations | null;
}

/** Admin: approve, reject, or reset application status. */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as ApplicationRow;
}

/** Public apply flow — uses anon RPC (no service role on user-facing path). */
export async function submitApplicationViaRpc(args: SubmitApplicationRpcArgs) {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('submit_application', args);

  if (error) throw error;
  return data as string;
}

/** Contact form — public RPC. */
export async function submitContactMessageViaRpc(
  args: SubmitContactMessageRpcArgs
) {
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc('submit_contact_message', args);

  if (error) throw error;
  return data as string;
}

/** Admin: subscriptions with learner summary. */
export async function listSubscriptions(filters?: SubscriptionFilters) {
  const supabase = createServiceClient();
  let query = supabase
    .from('subscriptions')
    .select(
      `
      *,
      learners (id, first_name, last_name, grade, school_name)
    `
    )
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.packageId) query = query.eq('package_id', filters.packageId);
  if (filters?.learnerId) query = query.eq('learner_id', filters.learnerId);

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SubscriptionWithLearner[];
}

export async function updateSubscriptionStatus(
  id: string,
  status: SubscriptionRow['status']
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as SubscriptionRow;
}

/** Admin: tutor timesheets with tutor name. */
export async function listTimesheets(filters?: TimesheetFilters) {
  const supabase = createServiceClient();
  let query = supabase
    .from('tutor_timesheets')
    .select(
      `
      *,
      tutors (id, first_name, last_name, email)
    `
    )
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.tutorId) query = query.eq('tutor_id', filters.tutorId);
  if (filters?.monthPeriod)
    query = query.eq('month_period', filters.monthPeriod);

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TutorTimesheetWithTutor[];
}

export async function updateTimesheetStatus(
  id: string,
  status: TutorTimesheetRow['status'],
  notes?: string
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_timesheets')
    .update({ status, ...(notes !== undefined ? { notes } : {}) })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as TutorTimesheetRow;
}

/** Admin: contact enquiries (newest first). */
export async function listContactMessages(limit = 50, offset = 0) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as ContactMessageRow[];
}

/** Admin: create subscription for a learner after approval. */
export async function createSubscriptionForLearner(
  learnerId: string,
  packageId: string
) {
  const supabase = createServiceClient();
  const amountCents = packageAmountCents(packageId);
  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      learner_id: learnerId,
      package_id: packageId,
      status: 'pending',
      amount_cents: amountCents,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as SubscriptionRow;
}

/** Admin: list classes with learner/tutor names. */
export async function listClasses(learnerId?: string) {
  const supabase = createServiceClient();
  let query = supabase
    .from('classes')
    .select(
      `
      *,
      learners (id, first_name, last_name, grade),
      tutors (id, first_name, last_name)
    `
    )
    .order('created_at', { ascending: false });

  if (learnerId) query = query.eq('learner_id', learnerId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type ClassInput = {
  learner_id?: string | null;
  tutor_id?: string | null;
  subject: string;
  grade: number;
  band?: ClassBand | null;
  band_label?: string | null;
  schedule_day?: string | null;
  schedule_time?: string | null;
  meet_link?: string | null;
  max_enrollment?: number;
  is_active?: boolean;
  level?: string | null;
  schedule?: string | null;
};

export type GroupClassUpdateInput = {
  tutor_id: string | null;
  schedule_day: string | null;
  schedule_time: string | null;
  meet_link: string | null;
  max_enrollment: number;
  is_active: boolean;
};

type TutorNamePick = Pick<TutorRow, 'id' | 'first_name' | 'last_name'>;

function unwrapTutorRelation(
  tutors:
    | TutorNamePick
    | TutorNamePick[]
    | (TutorNamePick | null | undefined)[]
    | null
    | undefined
): TutorNamePick | null {
  if (!tutors) return null;
  if (Array.isArray(tutors)) {
    return tutors.find((t): t is TutorNamePick => t != null) ?? null;
  }
  return tutors;
}

function parseScheduleDay(schedule: string): string | null {
  const lower = schedule.toLowerCase();
  if (lower.startsWith('mon')) return 'monday';
  if (lower.startsWith('tue')) return 'tuesday';
  if (lower.startsWith('wed')) return 'wednesday';
  if (lower.startsWith('thu')) return 'thursday';
  if (lower.startsWith('fri')) return 'friday';
  if (lower.startsWith('sat')) return 'saturday';
  return null;
}

function parseScheduleTime(schedule: string): string | null {
  const match = schedule.match(/(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

export async function upsertClass(id: string | null, input: ClassInput) {
  const supabase = createServiceClient();
  const scheduleDay =
    input.schedule_day ?? parseScheduleDay(input.schedule ?? '') ?? null;
  const scheduleTime =
    input.schedule_time ?? parseScheduleTime(input.schedule ?? '') ?? null;

  const payload = {
    ...input,
    schedule_day: scheduleDay,
    schedule_time: scheduleTime,
  };

  if (id) {
    const { data, error } = await supabase
      .from('classes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as ClassRow;
  }

  const { data, error } = await supabase
    .from('classes')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as ClassRow;
}

/** Admin: list group classes (learner_id = null) with active enrollment counts. */
export async function listGroupClassesForAdmin(): Promise<GroupClassWithCount[]> {
  const supabase = createServiceClient();
  const { data: classes, error } = await supabase
    .from('classes')
    .select(
      `
      id, learner_id, tutor_id, subject, grade, band, band_label,
      schedule_day, schedule_time, meet_link, max_enrollment, is_active,
      schedule, level, created_at,
      tutors (id, first_name, last_name)
    `
    )
    .is('learner_id', null)
    .order('grade')
    .order('subject')
    .order('band');

  if (error) throw error;

  const ids = (classes ?? []).map((c) => c.id as string);
  if (!ids.length) return [];

  const { data: counts } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('status', 'active')
    .in('class_id', ids);

  const countMap = (counts ?? []).reduce(
    (m, r) => {
      const cid = r.class_id as string;
      m[cid] = (m[cid] ?? 0) + 1;
      return m;
    },
    {} as Record<string, number>
  );

  return (classes ?? []).map((row) => {
    const { tutors: tutorsRaw, ...rest } = row as ClassRow & {
      tutors?: GroupClassWithCount['tutors'] | GroupClassWithCount['tutors'][];
    };
    return {
      ...(rest as ClassRow),
      enrollment_count: countMap[rest.id] ?? 0,
      tutors: unwrapTutorRelation(tutorsRaw ?? null),
    };
  });
}

/** Admin: single group class with active enrollments. */
export async function getGroupClassById(id: string) {
  const supabase = createServiceClient();
  const { data: cls, error } = await supabase
    .from('classes')
    .select(
      `
      id, learner_id, tutor_id, subject, grade, band, band_label,
      schedule_day, schedule_time, meet_link, max_enrollment, is_active,
      schedule, level, created_at,
      tutors (id, first_name, last_name, email)
    `
    )
    .eq('id', id)
    .is('learner_id', null)
    .maybeSingle();

  if (error) throw error;
  if (!cls) return null;

  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select(
      `
      id, learner_id, status, enrolled_at,
      learners (id, first_name, last_name, grade, school_name)
    `
    )
    .eq('class_id', id)
    .eq('status', 'active')
    .order('enrolled_at');

  const { count } = await supabase
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', id)
    .eq('status', 'active');

  const { tutors: tutorsRaw, ...clsRest } = cls as ClassRow & {
    tutors?:
      | Pick<TutorRow, 'id' | 'first_name' | 'last_name' | 'email'>
      | Pick<TutorRow, 'id' | 'first_name' | 'last_name' | 'email'>[];
  };

  return {
    cls: {
      ...(clsRest as ClassRow),
      tutors: unwrapTutorRelation(
        tutorsRaw as
          | Pick<TutorRow, 'id' | 'first_name' | 'last_name' | 'email'>
          | Pick<TutorRow, 'id' | 'first_name' | 'last_name' | 'email'>[]
          | null
          | undefined
      ),
    },
    enrollments: enrollments ?? [],
    enrollment_count: count ?? 0,
  };
}

export async function updateGroupClass(id: string, input: GroupClassUpdateInput) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('classes')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as ClassRow;
}

export async function enrollLearnerInGroupClass(
  classId: string,
  learnerId: string
) {
  const supabase = createServiceClient();

  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('max_enrollment, grade, subject, band, is_active, learner_id')
    .eq('id', classId)
    .single();

  if (clsError || !cls) throw new Error('Class not found');
  if (cls.learner_id != null) throw new Error('Not a group class');
  if (!cls.is_active) throw new Error('Class is not active');

  const { count } = await supabase
    .from('class_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('status', 'active');

  const max = cls.max_enrollment ?? 8;
  if ((count ?? 0) >= max) {
    throw new Error(`Class is full (max ${max} learners)`);
  }

  const { data: existing } = await supabase
    .from('class_enrollments')
    .select('id, class_id, classes!inner(subject, grade)')
    .eq('learner_id', learnerId)
    .eq('status', 'active');

  const duplicates = (existing ?? []).filter((row) => {
    const c = row.classes as { subject: string; grade: number } | { subject: string; grade: number }[];
    const meta = Array.isArray(c) ? c[0] : c;
    return (
      meta?.subject === cls?.subject &&
      meta?.grade === cls?.grade &&
      row.class_id !== classId
    );
  });

  if (duplicates.length) {
    await supabase
      .from('class_enrollments')
      .update({ status: 'cancelled' })
      .in(
        'id',
        duplicates.map((d) => d.id as string)
      );
  }

  const { error } = await supabase.from('class_enrollments').upsert(
    { class_id: classId, learner_id: learnerId, status: 'active' },
    { onConflict: 'learner_id,class_id' }
  );
  if (error) throw error;
}

export async function unenrollLearnerFromGroupClass(enrollmentId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('class_enrollments')
    .update({ status: 'cancelled' })
    .eq('id', enrollmentId);
  if (error) throw error;
}

export async function deleteClass(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

export async function listLearnersForAdmin() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('learners')
    .select('id, first_name, last_name, grade, school_name, parent_id')
    .order('last_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Pick<
    LearnerRow,
    'id' | 'first_name' | 'last_name' | 'grade' | 'school_name' | 'parent_id'
  >[];
}

export async function listTutorsForAdmin() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutors')
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      session_rate_cents,
      subjects,
      tutor_profiles (vetting_status)
    `
    )
    .order('last_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listParentsForAdmin() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('parents')
    .select('id, first_name, last_name, email, phone, province, created_at')
    .order('last_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Pick<
    ParentRow,
    'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'province' | 'created_at'
  >[];
}

export async function getParentById(id: string) {
  const supabase = createServiceClient();
  const { data: parent, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!parent) return null;

  const { data: learners, error: learnersError } = await supabase
    .from('learners')
    .select('*')
    .eq('parent_id', id)
    .order('first_name', { ascending: true });
  if (learnersError) throw learnersError;

  return {
    parent: parent as ParentRow,
    learners: (learners ?? []) as LearnerRow[],
  };
}

export async function getLearnerById(id: string) {
  const supabase = createServiceClient();
  const { data: learner, error } = await supabase
    .from('learners')
    .select('*, parents (*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!learner) return null;

  const [subsRes, classesRes, reportsRes] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('learner_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('classes')
      .select('*, tutors (id, first_name, last_name)')
      .eq('learner_id', id)
      .order('subject', { ascending: true }),
    supabase
      .from('learner_reports')
      .select('*')
      .eq('learner_id', id)
      .order('uploaded_at', { ascending: false }),
  ]);

  if (subsRes.error) throw subsRes.error;
  if (classesRes.error) throw classesRes.error;
  if (reportsRes.error) throw reportsRes.error;

  return {
    learner: learner as LearnerRow & { parents: ParentRow | null },
    subscriptions: subsRes.data ?? [],
    classes: classesRes.data ?? [],
    reports: (reportsRes.data ?? []) as LearnerReportRow[],
  };
}

export async function getTutorById(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutors')
    .select(
      `
      *,
      tutor_profiles (*),
      tutor_documents (*)
    `
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as TutorRow & {
    tutor_profiles: TutorProfileRow | TutorProfileRow[] | null;
    tutor_documents: TutorDocumentRow[] | null;
  };

  const profile = Array.isArray(row.tutor_profiles)
    ? row.tutor_profiles[0] ?? null
    : row.tutor_profiles;

  return {
    tutor: row,
    profile,
    documents: row.tutor_documents ?? [],
  };
}

export async function updateTutorVetting(
  tutorId: string,
  status: TutorVettingStatus,
  notes?: string
) {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('tutor_profiles')
    .update({
      vetting_status: status,
      rejection_reason:
        status === 'rejected' ? (notes?.trim() || null) : null,
      vetted_at:
        status === 'approved' || status === 'rejected' ? now : null,
    })
    .eq('tutor_id', tutorId)
    .select('*')
    .single();
  if (error) throw error;
  return data as TutorProfileRow;
}

export async function getTimesheetById(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutor_timesheets')
    .select(
      `
      *,
      tutors (id, first_name, last_name, email, session_rate_cents),
      timesheet_sessions (*)
    `
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as TutorTimesheetWithTutor & {
    timesheet_sessions?: TimesheetSessionRow[];
  } | null;
}

export type TimesheetSessionRow = {
  id: string;
  timesheet_id: string;
  session_date: string;
  learner_id: string | null;
  class_id: string | null;
  subject: string | null;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
};

export async function getClassById(id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('classes')
    .select(
      `
      *,
      learners (id, first_name, last_name, grade, school_name, parent_id),
      tutors (id, first_name, last_name, email)
    `
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPaymentsForAdmin(limit = 100) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('payments')
    .select(
      `
      *,
      learners (id, first_name, last_name),
      parents (id, first_name, last_name, email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as (PaymentRow & {
    learners: Pick<LearnerRow, 'id' | 'first_name' | 'last_name'> | null;
    parents: Pick<ParentRow, 'id' | 'first_name' | 'last_name' | 'email'> | null;
  })[];
}

export async function listLearnerReportsForAdmin(limit = 100) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('learner_reports')
    .select(
      `
      *,
      learners (id, first_name, last_name, grade, parent_id, parents (first_name, last_name, email))
    `
    )
    .order('uploaded_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getAdminDashboardKpis() {
  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  const [
    activeLearners,
    pendingApplications,
    tutorsAwaitingVetting,
    pendingTimesheets,
    overdueSubscriptions,
    revenueRes,
    awaitingPaymentLeads,
    contactMessages,
  ] = await Promise.all([
    supabase
      .from('learners')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('tutor_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('vetting_status', 'pending'),
    supabase
      .from('tutor_timesheets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted'),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'overdue'),
    supabase
      .from('payments')
      .select('amount_cents')
      .eq('status', 'complete')
      .gte('paid_at', since),
    supabase
      .from('enrollment_leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'awaiting_payment'),
    supabase
      .from('contact_messages')
      .select('id', { count: 'exact', head: true }),
  ]);

  const revenueCents = (revenueRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );

  return {
    activeLearners: activeLearners.count ?? 0,
    pendingApplications: pendingApplications.count ?? 0,
    tutorsAwaitingVetting: tutorsAwaitingVetting.count ?? 0,
    pendingTimesheets: pendingTimesheets.count ?? 0,
    overdueSubscriptions: overdueSubscriptions.count ?? 0,
    revenueCents30d: revenueCents,
    awaitingPaymentLeads: awaitingPaymentLeads.count ?? 0,
    contactMessages: contactMessages.count ?? 0,
  };
}

/** Parent portal: lookup by guardian email (service role). */
export async function getParentPortalData(email: string) {
  const supabase = createServiceClient();
  const normalized = email.trim().toLowerCase();

  const { data: parent, error: parentError } = await supabase
    .from('parents')
    .select('*')
    .eq('email', normalized)
    .maybeSingle();

  if (parentError) throw parentError;
  if (!parent) return null;

  const parentRow = parent as ParentRow;

  const learnersRes = await supabase
    .from('learners')
    .select('*')
    .eq('parent_id', parentRow.id);

  if (learnersRes.error) throw learnersRes.error;

  const learners = (learnersRes.data ?? []) as LearnerRow[];
  const learnerIds = learners.map((l) => l.id);

  const [appsRes, subsRes, classesRes] = await Promise.all([
    supabase
      .from('applications')
      .select('*')
      .eq('parent_id', parentRow.id)
      .order('created_at', { ascending: false }),
    learnerIds.length
      ? supabase
          .from('subscriptions')
          .select(
            '*, learners (id, first_name, last_name, grade, parent_id)'
          )
          .in('learner_id', learnerIds)
      : Promise.resolve({ data: [], error: null }),
    learnerIds.length
      ? supabase
          .from('classes')
          .select('*, learners (id, first_name, last_name, parent_id)')
          .in('learner_id', learnerIds)
          .order('subject', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (appsRes.error) throw appsRes.error;
  if (subsRes.error) throw subsRes.error;
  if (classesRes.error) throw classesRes.error;

  return {
    parent: parentRow,
    learners,
    applications: (appsRes.data ?? []) as ApplicationRow[],
    subscriptions: subsRes.data ?? [],
    classes: classesRes.data ?? [],
  };
}

/** Tutor portal: lookup by tutor email. */
export async function getTutorByEmail(email: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('tutors')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data as TutorRow | null;
}

export async function submitTutorTimesheet(input: {
  tutorId: string;
  monthPeriod: string;
  sessionsCount: number;
}) {
  const supabase = createServiceClient();

  const { data: tutor, error: tutorError } = await supabase
    .from('tutors')
    .select('session_rate_cents')
    .eq('id', input.tutorId)
    .single();

  if (tutorError || !tutor) throw tutorError ?? new Error('Tutor not found');

  const amountCents = tutor.session_rate_cents * input.sessionsCount;

  const { data, error } = await supabase
    .from('tutor_timesheets')
    .upsert(
      {
        tutor_id: input.tutorId,
        month_period: input.monthPeriod,
        sessions_count: input.sessionsCount,
        amount_cents: amountCents,
        status: 'submitted',
      },
      { onConflict: 'tutor_id,month_period' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as TutorTimesheetRow;
}

/** Admin: CSV-friendly flat rows for export. */
export async function exportApplicationsCsv(filters?: ApplicationFilters) {
  const rows = await getApplications({ ...filters, limit: 5000, offset: 0 });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    province: row.province,
    subjects: row.subjects.join('; '),
    package_id: row.package_id,
    parent_name: row.parents
      ? `${row.parents.first_name} ${row.parents.last_name}`
      : '',
    parent_email: row.parents?.email ?? '',
    parent_phone: row.parents?.phone ?? '',
    learner_name: row.learners
      ? `${row.learners.first_name} ${row.learners.last_name}`
      : '',
    learner_grade: row.learners?.grade ?? '',
    school: row.learners?.school_name ?? '',
    report_url: row.report_url ?? '',
    payment_proof_url: row.payment_proof_url ?? '',
    created_at: row.created_at,
  }));
}
