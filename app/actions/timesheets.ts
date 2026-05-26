'use server';

import { revalidatePath } from 'next/cache';
import { sendTimesheetStatusEmail } from '@/lib/email';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { updateTimesheetStatus as updateTimesheetStatusDb } from '@/lib/supabase/admin';
import type { TimesheetFilters, TimesheetStatus } from '@/lib/types/database';
import type {
  TimesheetSessionRow,
  TimesheetWithSessions,
} from '@/lib/types/tutor-admin';

export type TimesheetSessionInput = {
  sessionDate: string;
  classId?: string | null;
  subject?: string | null;
  learnerCount?: number;
  durationMinutes?: number;
  notes?: string | null;
};

export async function listTimesheetsWithSessions(
  filters: TimesheetFilters = {}
): Promise<{ data: TimesheetWithSessions[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('tutor_timesheets')
    .select(
      `
      *,
      tutors ( id, first_name, last_name, email ),
      timesheet_sessions (*)
    `
    )
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.tutorId) query = query.eq('tutor_id', filters.tutorId);
  if (filters.monthPeriod) query = query.eq('month_period', filters.monthPeriod);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TimesheetWithSessions[] };
}

export async function submitTimesheetWithSessions(input: {
  tutorId: string;
  monthPeriod: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  sessions: TimesheetSessionInput[];
}): Promise<{ ok: boolean; timesheetId?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  if (!input.sessions.length) {
    return { ok: false, error: 'Add at least one session.' };
  }

  const supabase = createServiceClient();
  const { data: tutor, error: tutorError } = await supabase
    .from('tutors')
    .select('session_rate_cents, first_name, last_name, email')
    .eq('id', input.tutorId)
    .single();

  if (tutorError || !tutor) {
    return { ok: false, error: tutorError?.message ?? 'Tutor not found' };
  }

  const sessionsCount = input.sessions.length;
  const amountCents = tutor.session_rate_cents * sessionsCount;

  const { data: timesheet, error: tsError } = await supabase
    .from('tutor_timesheets')
    .upsert(
      {
        tutor_id: input.tutorId,
        month_period: input.monthPeriod,
        period_start: input.periodStart ?? null,
        period_end: input.periodEnd ?? null,
        sessions_count: sessionsCount,
        amount_cents: amountCents,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id,month_period' }
    )
    .select('id')
    .single();

  if (tsError || !timesheet) {
    return { ok: false, error: tsError?.message ?? 'Could not save timesheet' };
  }

  await supabase
    .from('timesheet_sessions')
    .delete()
    .eq('timesheet_id', timesheet.id);

  const rows = input.sessions.map((s) => ({
    timesheet_id: timesheet.id,
    session_date: s.sessionDate,
    class_id: s.classId ?? null,
    subject: s.subject ?? null,
    learner_count: s.learnerCount ?? 1,
    duration_minutes: s.durationMinutes ?? 60,
    amount_cents: tutor.session_rate_cents,
    notes: s.notes ?? null,
  }));

  const { error: sessionsError } = await supabase
    .from('timesheet_sessions')
    .insert(rows);

  if (sessionsError) {
    return { ok: false, error: sessionsError.message };
  }

  revalidatePath('/admin/dashboard/timesheets');
  revalidatePath('/portal/tutor');
  return { ok: true, timesheetId: timesheet.id };
}

export async function approveTimesheet(
  id: string,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  return setTimesheetDecision(id, 'approved', notes);
}

export async function rejectTimesheet(
  id: string,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  return setTimesheetDecision(id, 'rejected', notes);
}

async function setTimesheetDecision(
  id: string,
  status: Extract<TimesheetStatus, 'approved' | 'rejected'>,
  notes?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  try {
    const supabase = createServiceClient();
    const { data: row, error: fetchError } = await supabase
      .from('tutor_timesheets')
      .select(
        `
        *,
        tutors ( first_name, last_name, email )
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !row) {
      return { ok: false, error: fetchError?.message ?? 'Timesheet not found' };
    }

    await updateTimesheetStatusDb(id, status, notes);

    const tutor = row.tutors as {
      first_name: string;
      last_name: string;
      email: string;
    } | null;

    if (tutor?.email) {
      await sendTimesheetStatusEmail({
        to: tutor.email,
        tutorName: `${tutor.first_name} ${tutor.last_name}`,
        monthPeriod: row.month_period,
        status,
        amountCents: row.amount_cents,
        notes,
      });
    }

    revalidatePath('/admin/dashboard/timesheets');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not update timesheet',
    };
  }
}

export async function getTimesheetSessions(
  timesheetId: string
): Promise<{ data: TimesheetSessionRow[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('timesheet_sessions')
    .select('*')
    .eq('timesheet_id', timesheetId)
    .order('session_date', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as TimesheetSessionRow[] };
}
