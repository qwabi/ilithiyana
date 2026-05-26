import { createAnonClient, createServiceClient } from '@/lib/supabase/server';
import type {
  ApplicationFilters,
  ApplicationRow,
  ApplicationStatus,
  ApplicationWithRelations,
  ClassRow,
  ContactMessageRow,
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
  learner_id: string;
  tutor_id?: string | null;
  subject: string;
  grade: number;
  level?: string | null;
  schedule?: string | null;
  meet_link?: string | null;
};

export async function upsertClass(id: string | null, input: ClassInput) {
  const supabase = createServiceClient();
  if (id) {
    const { data, error } = await supabase
      .from('classes')
      .update(input)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as ClassRow;
  }

  const { data, error } = await supabase
    .from('classes')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as ClassRow;
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
    .select('id, first_name, last_name, email, session_rate_cents')
    .order('last_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Pick<
    TutorRow,
    'id' | 'first_name' | 'last_name' | 'email' | 'session_rate_cents'
  >[];
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
