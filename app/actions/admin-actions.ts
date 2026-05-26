'use server';

import { cookies } from 'next/headers';
import {
  ADMIN_SESSION_COOKIE,
  signAdminSessionToken,
} from '@/lib/admin-session-token';
import {
  formatSubjectLabels,
  resolveLearnerSubjectIds,
} from '@/lib/curriculum/learner-subjects';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createApplicationDocumentSignedUrl } from '@/lib/supabase/storage';
import {
  createSubscriptionForLearner,
  deleteClass,
  getAdminDashboardKpis,
  getApplicationById,
  getClassById,
  getLearnerById,
  getParentById,
  getTimesheetById,
  getTutorById,
  listGroupClassesForAdmin,
  listContactMessages,
  listLearnerReportsForAdmin,
  listLearnersForAdmin,
  listParentsForAdmin,
  listPaymentsForAdmin,
  listSubscriptions,
  listTimesheets,
  listTutorsForAdmin,
  updateApplicationStatus as updateApplicationStatusAdmin,
  updateSubscriptionStatus,
  updateTimesheetStatus,
  updateTutorVetting,
  upsertClass,
  type ClassInput,
} from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendApplicationStatusEmail } from '@/lib/email';
import type {
  ApplicationRow,
  ApplicationStatus,
  EnrollmentLeadRow,
  EnrollmentLeadFilters,
  SubscriptionStatus,
  TimesheetStatus,
} from '@/lib/types/database';
import { revalidatePath } from 'next/cache';

export type { EnrollmentLeadFilters } from '@/lib/types/database';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type ApplicationFilters = {
  province?: string;
  grade?: string;
  subject?: string;
  package_id?: string;
  status?: ApplicationStatus | '';
};

async function setAdminSessionCookie(email: string) {
  const token = await signAdminSessionToken(email, SESSION_MAX_AGE);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (!authError && authData.user) {
        const service = createServiceClient();
        const { data: adminProfile } = await service
          .from('admin_profiles')
          .select('profile_id, email, is_active')
          .eq('profile_id', authData.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (adminProfile?.email) {
          await setAdminSessionCookie(adminProfile.email);
          return { ok: true };
        }
      }
    } catch {
      /* fall through to env credentials */
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return {
      ok: false,
      error:
        'Admin login is not configured. Set Supabase admin_profiles or ADMIN_EMAIL / ADMIN_PASSWORD.',
    };
  }

  if (normalizedEmail !== adminEmail.toLowerCase() || password !== adminPassword) {
    return { ok: false, error: 'Invalid email or password.' };
  }

  await setAdminSessionCookie(adminEmail);
  return { ok: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function listApplications(
  filters: ApplicationFilters = {}
): Promise<{ data: ApplicationRow[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.province) {
    query = query.eq('province', filters.province);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.package_id) {
    query = query.eq('package_id', filters.package_id);
  }
  if (filters.subject) {
    query = query.contains('subjects', [filters.subject]);
  }
  if (filters.grade) {
    query = query.eq('learner_snapshot->>grade', filters.grade);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as ApplicationRow[] };
}

export async function updateApplicationStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  try {
    const supabase = createServiceClient();
    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select('*, learners(id)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !app) {
      return { ok: false, error: fetchError?.message ?? 'Application not found' };
    }

    await updateApplicationStatusAdmin(id, status);

    if (status === 'approved' && app.learner_id) {
      const existing = await supabase
        .from('subscriptions')
        .select('id')
        .eq('learner_id', app.learner_id)
        .limit(1);

      if (!existing.data?.length) {
        await createSubscriptionForLearner(app.learner_id, app.package_id);
      }
    }

    const parent = app.parent_snapshot as {
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    const learner = app.learner_snapshot as {
      firstName?: string;
      lastName?: string;
    };

    if (parent?.email) {
      await sendApplicationStatusEmail({
        to: parent.email,
        parentName:
          [parent.firstName, parent.lastName].filter(Boolean).join(' ') ||
          'Parent',
        learnerName:
          [learner?.firstName, learner?.lastName].filter(Boolean).join(' ') ||
          'your learner',
        status,
      });
    }

    revalidatePath('/admin/dashboard/applications');
    revalidatePath(`/admin/dashboard/applications/${id}`);
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/dashboard/subscriptions');
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Update failed';
    return { ok: false, error: message };
  }
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function snapshotStr(snapshot: Record<string, unknown>, key: string): string {
  const v = snapshot[key];
  return v == null ? '' : String(v);
}

export async function exportApplicationsCSV(
  filters: ApplicationFilters = {}
): Promise<{ csv: string; error?: string }> {
  const { data, error } = await listApplications(filters);
  if (error) {
    return { csv: '', error };
  }

  const headers = [
    'id',
    'created_at',
    'status',
    'province',
    'package_id',
    'subjects',
    'parent_first_name',
    'parent_last_name',
    'parent_email',
    'parent_phone',
    'learner_first_name',
    'learner_last_name',
    'learner_grade',
    'learner_school',
    'report_url',
    'payment_proof_url',
  ];

  const rows = data.map((app) => {
    const parent = app.parent_snapshot ?? {};
    const learner = app.learner_snapshot ?? {};
    return [
      app.id,
      app.created_at,
      app.status,
      app.province,
      app.package_id,
      formatSubjectLabels(
        resolveLearnerSubjectIds(
          app.subjects ?? [],
          Number(snapshotStr(learner, 'grade')) || 10
        ),
        Number(snapshotStr(learner, 'grade')) || 10
      ).join('; '),
      snapshotStr(parent, 'firstName'),
      snapshotStr(parent, 'lastName'),
      snapshotStr(parent, 'email'),
      snapshotStr(parent, 'phone'),
      snapshotStr(learner, 'firstName'),
      snapshotStr(learner, 'lastName'),
      snapshotStr(learner, 'grade'),
      snapshotStr(learner, 'schoolName'),
      app.report_url ?? '',
      app.payment_proof_url ?? '',
    ]
      .map((cell) => escapeCsv(String(cell)))
      .join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  return { csv };
}

export async function fetchSubscriptions(filters?: {
  status?: SubscriptionStatus;
}) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listSubscriptions(filters);
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load subscriptions',
    };
  }
}

export async function setSubscriptionStatus(
  id: string,
  status: SubscriptionStatus
) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  try {
    await updateSubscriptionStatus(id, status);
    revalidatePath('/admin/dashboard/subscriptions');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Update failed',
    };
  }
}

export async function fetchTimesheets(filters?: { status?: TimesheetStatus }) {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listTimesheets(filters);
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load timesheets',
    };
  }
}

export async function setTimesheetStatus(
  id: string,
  status: TimesheetStatus,
  notes?: string
) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  if (status === 'approved' || status === 'rejected') {
    const { adminSetTimesheetStatus } = await import('@/lib/tutor/actions');
    return adminSetTimesheetStatus(id, status, notes);
  }
  try {
    await updateTimesheetStatus(id, status, notes);
    revalidatePath('/admin/dashboard/timesheets');
    revalidatePath(`/admin/dashboard/timesheets/${id}`);
    revalidatePath('/admin/dashboard');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Update failed',
    };
  }
}

export async function fetchContactMessages() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listContactMessages(100);
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load messages',
    };
  }
}

export async function fetchClasses() {
  if (!isSupabaseConfigured()) {
    return { data: [], learners: [], tutors: [], error: 'Supabase is not configured.' };
  }
  try {
    const [data, learners, tutors] = await Promise.all([
      listGroupClassesForAdmin(),
      listLearnersForAdmin(),
      listTutorsForAdmin(),
    ]);
    return { data, learners, tutors };
  } catch (e) {
    return {
      data: [],
      learners: [],
      tutors: [],
      error: e instanceof Error ? e.message : 'Failed to load classes',
    };
  }
}

export async function saveClass(
  id: string | null,
  input: ClassInput
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  try {
    await upsertClass(id, input);
    revalidatePath('/admin/dashboard/classes');
    if (id) revalidatePath(`/admin/dashboard/classes/${id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Save failed',
    };
  }
}

export async function removeClass(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  try {
    await deleteClass(id);
    revalidatePath('/admin/dashboard/classes');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Delete failed',
    };
  }
}

/** Admin: signed URL for an application school report. */
export async function getApplicationReportViewUrl(
  applicationId: string
): Promise<{ url: string | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data: app, error } = await supabase
    .from('applications')
    .select('report_storage_path, report_url')
    .eq('id', applicationId)
    .maybeSingle();

  if (error) {
    return { url: null, error: error.message };
  }

  if (!app) {
    return { url: null, error: 'Application not found.' };
  }

  if (app.report_storage_path) {
    const signed = await createApplicationDocumentSignedUrl(
      app.report_storage_path,
      60 * 60
    );
    return { url: signed };
  }

  if (app.report_url?.startsWith('http')) {
    return { url: app.report_url };
  }

  return { url: null };
}

/** Admin: signed URL for a school report (Supabase Storage or legacy blob URL). */
export async function getEnrollmentLeadReportViewUrl(
  leadId: string
): Promise<{ url: string | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { url: null, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('report_storage_path, report_url')
    .eq('id', leadId)
    .maybeSingle();

  if (error) {
    return { url: null, error: error.message };
  }

  if (!lead) {
    return { url: null, error: 'Lead not found.' };
  }

  if (lead.report_storage_path) {
    const signed = await createApplicationDocumentSignedUrl(
      lead.report_storage_path,
      60 * 60
    );
    return { url: signed };
  }

  if (lead.report_url?.startsWith('http')) {
    return { url: lead.report_url };
  }

  return { url: null };
}

export async function listEnrollmentLeads(
  filters: EnrollmentLeadFilters = {}
): Promise<{ data: EnrollmentLeadRow[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('enrollment_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.province) {
    query = query.eq('province', filters.province);
  }
  if (filters.package_id) {
    query = query.eq('package_id', filters.package_id);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as EnrollmentLeadRow[] };
}

export type AdminDashboardKpis = {
  activeLearners: number;
  pendingApplications: number;
  tutorsAwaitingVetting: number;
  pendingTimesheets: number;
  overdueSubscriptions: number;
  revenueCents30d: number;
  awaitingPaymentLeads: number;
  contactMessages: number;
};

export async function getDashboardKpis(): Promise<AdminDashboardKpis> {
  if (!isSupabaseConfigured()) {
    return {
      activeLearners: 0,
      pendingApplications: 0,
      tutorsAwaitingVetting: 0,
      pendingTimesheets: 0,
      overdueSubscriptions: 0,
      revenueCents30d: 0,
      awaitingPaymentLeads: 0,
      contactMessages: 0,
    };
  }

  try {
    return await getAdminDashboardKpis();
  } catch {
    return {
      activeLearners: 0,
      pendingApplications: 0,
      tutorsAwaitingVetting: 0,
      pendingTimesheets: 0,
      overdueSubscriptions: 0,
      revenueCents30d: 0,
      awaitingPaymentLeads: 0,
      contactMessages: 0,
    };
  }
}

/** @deprecated Use getDashboardKpis */
export async function getDashboardCounts() {
  const kpis = await getDashboardKpis();
  return {
    applications: kpis.pendingApplications,
    contactMessages: kpis.contactMessages,
    pendingApplications: kpis.pendingApplications,
    awaitingPaymentLeads: kpis.awaitingPaymentLeads,
  };
}

export async function fetchApplicationById(id: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const data = await getApplicationById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load application',
    };
  }
}

export async function fetchLearners() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listLearnersForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load learners',
    };
  }
}

export async function fetchLearnerById(id: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const data = await getLearnerById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load learner',
    };
  }
}

export async function fetchParents() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listParentsForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load parents',
    };
  }
}

export async function fetchParentById(id: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const data = await getParentById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load parent',
    };
  }
}

export async function fetchTutors() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listTutorsForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load tutors',
    };
  }
}

export async function fetchTutorById(id: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const data = await getTutorById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load tutor',
    };
  }
}

export async function setTutorVettingStatus(
  tutorId: string,
  status: 'approved' | 'rejected',
  notes?: string
) {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }
  try {
    await updateTutorVetting(tutorId, status, notes);
    revalidatePath('/admin/dashboard/tutors');
    revalidatePath(`/admin/dashboard/tutors/${tutorId}`);
    revalidatePath('/admin/dashboard');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Vetting update failed',
    };
  }
}

export async function fetchTimesheetById(id: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const data = await getTimesheetById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load timesheet',
    };
  }
}

export async function fetchClassById(id: string) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }
  try {
    const data = await getClassById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Failed to load class',
    };
  }
}

export async function fetchPayments() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listPaymentsForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load payments',
    };
  }
}

export async function fetchReports() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }
  try {
    const data = await listLearnerReportsForAdmin();
    return { data };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e.message : 'Failed to load reports',
    };
  }
}
