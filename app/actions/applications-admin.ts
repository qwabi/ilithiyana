'use server';

import { revalidatePath } from 'next/cache';
import {
  createSubscriptionForLearner,
  exportApplicationsCsv,
  getApplicationById,
  updateApplicationStatus as updateApplicationStatusDb,
} from '@/lib/supabase/admin';
import { sendApplicationStatusEmail } from '@/lib/email';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type {
  ApplicationFilters,
  ApplicationRow,
  ApplicationStatus,
  ApplicationWithRelations,
} from '@/lib/types/database';

export type { ApplicationFilters } from '@/lib/types/database';

export async function getApplication(
  id: string
): Promise<{ data: ApplicationWithRelations | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const data = await getApplicationById(id);
    return { data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Application not found',
    };
  }
}

export async function listApplicationsAdmin(
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

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.province) query = query.eq('province', filters.province);
  if (filters.packageId) query = query.eq('package_id', filters.packageId);
  if (filters.subject) query = query.contains('subjects', [filters.subject]);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  let rows = (data ?? []) as ApplicationRow[];
  if (filters.grade != null) {
    rows = rows.filter((row) => {
      const fromSnapshot = Number(
        (row.learner_snapshot as { grade?: number })?.grade
      );
      return fromSnapshot === filters.grade;
    });
  }

  return { data: rows };
}

export async function decideApplication(
  id: string,
  status: Extract<ApplicationStatus, 'approved' | 'rejected'>,
  opts?: { rejectionReason?: string; reviewedBy?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  try {
    const supabase = createServiceClient();
    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select('*, learners(id, first_name, last_name), parents(email, first_name, last_name)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !app) {
      return { ok: false, error: fetchError?.message ?? 'Application not found' };
    }

    await supabase
      .from('applications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: opts?.reviewedBy ?? null,
        rejection_reason:
          status === 'rejected' ? opts?.rejectionReason ?? null : null,
      })
      .eq('id', id);

    await updateApplicationStatusDb(id, status);

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

    const parent = app.parents as {
      email: string;
      first_name: string;
      last_name: string;
    } | null;
    const learner = app.learners as {
      first_name: string;
      last_name: string;
    } | null;

    if (parent?.email && learner) {
      await sendApplicationStatusEmail({
        to: parent.email,
        parentName: `${parent.first_name} ${parent.last_name}`,
        learnerName: `${learner.first_name} ${learner.last_name}`,
        status,
        rejectionReason: opts?.rejectionReason,
      });
    }

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/dashboard/applications');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not update application',
    };
  }
}

export async function exportApplications(
  filters?: ApplicationFilters
): Promise<{ rows: Record<string, string | number>[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { rows: [], error: 'Supabase is not configured.' };
  }

  try {
    const rows = await exportApplicationsCsv(filters);
    return { rows };
  } catch (e) {
    return {
      rows: [],
      error: e instanceof Error ? e.message : 'Export failed',
    };
  }
}

export async function listOverdueSubscriptions() {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      package_id,
      amount_cents,
      status,
      next_billing_date,
      period_end,
      next_reminder_at,
      learners (
        id,
        first_name,
        last_name,
        parents ( first_name, last_name, email )
      )
    `
    )
    .in('status', ['pending', 'overdue', 'active'])
    .order('next_billing_date', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}
