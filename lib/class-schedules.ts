import type { createServiceClient } from '@/lib/supabase/server';
import { allocationLog } from '@/lib/allocation-log';
import {
  scheduleForTutoringSubject,
  TUTORING_SUBJECT_SCHEDULE_DAY,
} from '@/lib/curriculum/subjects';

type ServiceClient = ReturnType<typeof createServiceClient>;

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** Weekly class slots per subject (South Africa Standard Time, UTC+2). */
const SUBJECT_SLOT_SAST: Record<string, { day: string; hour: number; minute: number }> =
  Object.fromEntries(
    Object.entries(TUTORING_SUBJECT_SCHEDULE_DAY).map(([subject, day]) => {
      const { schedule_time } = scheduleForTutoringSubject(subject);
      const [hour, minute] = schedule_time.split(':').map((n) => parseInt(n, 10));
      return [subject, { day, hour: hour || 18, minute: minute || 0 }];
    })
  );

SUBJECT_SLOT_SAST['Pure Mathematics'] = SUBJECT_SLOT_SAST['Pure Maths'];
SUBJECT_SLOT_SAST['Physical Sciences'] = SUBJECT_SLOT_SAST['Physical Science'];

const FALLBACK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const;

/** Sessions per subject for the upcoming calendar month (weekly). */
export const WEEKS_OF_SESSIONS = 4;

type ClassScheduleMeta = {
  id: string;
  subject: string;
  grade: number;
  schedule_day: string | null;
  schedule_time: string | null;
  schedule: string | null;
};

function slotForSubject(
  subject: string,
  fallbackIndex: number
): { day: string; hour: number; minute: number } {
  const known = SUBJECT_SLOT_SAST[subject.trim()];
  if (known) return known;
  const day = FALLBACK_DAYS[fallbackIndex % FALLBACK_DAYS.length];
  return { day, hour: 18, minute: 0 };
}

/**
 * UTC instant for a weekday + clock time in SAST (UTC+2, no daylight saving).
 * @param weekOffset 0 = first upcoming occurrence, 1 = following week, etc.
 */
export function scheduledAtSast(
  dayName: string,
  hourSast: number,
  minuteSast: number,
  weekOffset: number
): Date {
  const want = DAY_INDEX[dayName.trim().toLowerCase()];
  const utcHour = hourSast - 2;
  const now = new Date();
  const anchor = new Date(now);
  anchor.setUTCHours(utcHour, minuteSast, 0, 0);

  if (want !== undefined) {
    const current = anchor.getUTCDay();
    let delta = want - current;
    if (delta <= 0) delta += 7;
    anchor.setUTCDate(anchor.getUTCDate() + delta + weekOffset * 7);
    return anchor;
  }

  anchor.setUTCDate(anchor.getUTCDate() + 7 + weekOffset * 7);
  return anchor;
}

/** @deprecated Use scheduledAtSast — kept for callers that pass UTC hours in schedule_time. */
export function computeNextSessionTime(
  scheduleDay: string | null | undefined,
  scheduleTime: string | null | undefined
): Date {
  if (scheduleDay) {
    let hourSast = 18;
    let minuteSast = 0;
    if (scheduleTime) {
      const [hh, mm] = scheduleTime.split(':').map((p) => parseInt(p, 10));
      if (!Number.isNaN(hh)) {
        hourSast = hh + 2;
        minuteSast = Number.isNaN(mm) ? 0 : mm;
      }
    }
    return scheduledAtSast(scheduleDay, hourSast, minuteSast, 0);
  }
  return scheduledAtSast('tuesday', 18, 0, 0);
}

/**
 * Remove upcoming sessions for classes this learner just left.
 * Group classes with other active learners are left unchanged.
 */
export async function clearUpcomingSessionsForLearnerUnenrolledClasses(
  supabase: ServiceClient,
  learnerId: string,
  classIds: string[],
  context: string
): Promise<number> {
  if (!classIds.length) return 0;

  const toClear: string[] = [];

  for (const classId of classIds) {
    const { data: cls } = await supabase
      .from('classes')
      .select('id, learner_id')
      .eq('id', classId)
      .maybeSingle();

    if (cls?.learner_id === learnerId) {
      toClear.push(classId);
      continue;
    }

    const { count } = await supabase
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'active');

    if ((count ?? 0) === 0) {
      toClear.push(classId);
    }
  }

  return clearUpcomingSessionsForClassIds(supabase, toClear, context);
}

export async function clearUpcomingSessionsForClassIds(
  supabase: ServiceClient,
  classIds: string[],
  context: string
): Promise<number> {
  if (!classIds.length) return 0;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('class_sessions')
    .delete()
    .in('class_id', classIds)
    .eq('cancelled', false)
    .gte('scheduled_at', nowIso)
    .select('id');

  if (error) {
    allocationLog('clearUpcomingSessions:error', {
      context,
      classIds,
      error: error.message,
    });
    return 0;
  }

  const removed = data?.length ?? 0;
  allocationLog('clearUpcomingSessions:done', { context, classIds, removed });
  return removed;
}

/**
 * Replace upcoming sessions for a learner: one weekly slot per subject, 4 weeks ahead.
 */
export async function regenerateSessionsForLearnerEnrollments(
  supabase: ServiceClient,
  learnerId: string,
  context: string
): Promise<{ created: number; removed: number; classIds: string[] }> {
  allocationLog('regenerateSessions:start', { context, learnerId });

  const { data: enrollments, error } = await supabase
    .from('class_enrollments')
    .select(
      `
      class_id,
      status,
      classes (
        id, subject, grade, schedule_day, schedule_time, schedule
      )
    `
    )
    .eq('learner_id', learnerId)
    .eq('status', 'active');

  if (error || !enrollments?.length) {
    allocationLog('regenerateSessions:no_enrollments', {
      context,
      learnerId,
      error: error?.message,
    });
    return { created: 0, removed: 0, classIds: [] };
  }

  type Row = {
    classId: string;
    meta: ClassScheduleMeta;
  };

  const bySubject = new Map<string, Row>();
  for (const row of enrollments) {
    const classId = row.class_id as string;
    const cls = row.classes as ClassScheduleMeta | ClassScheduleMeta[] | null;
    const meta = Array.isArray(cls) ? cls[0] : cls;
    if (!meta?.subject) continue;
    const key = `${meta.grade}:${meta.subject}`;
    if (!bySubject.has(key)) {
      bySubject.set(key, { classId, meta });
    }
  }

  const uniqueRows = [...bySubject.values()].sort((a, b) =>
    a.meta.subject.localeCompare(b.meta.subject)
  );

  const classIds = uniqueRows.map((r) => r.classId);
  const removed = await clearUpcomingSessionsForClassIds(
    supabase,
    classIds,
    context
  );

  let created = 0;
  const nowIso = new Date().toISOString();

  for (let i = 0; i < uniqueRows.length; i++) {
    const { classId, meta } = uniqueRows[i];
    const slot =
      meta.schedule_day && meta.schedule_time
        ? (() => {
            const [hh, mm] = meta.schedule_time
              .split(':')
              .map((p) => parseInt(p, 10));
            return {
              day: meta.schedule_day,
              hour: Number.isNaN(hh) ? 18 : hh,
              minute: Number.isNaN(mm) ? 0 : mm,
            };
          })()
        : slotForSubject(meta.subject, i);

    for (let week = 0; week < WEEKS_OF_SESSIONS; week++) {
      const scheduledAt = scheduledAtSast(slot.day, slot.hour, slot.minute, week);
      if (scheduledAt.toISOString() < nowIso) continue;

      const { error: insertError } = await supabase.from('class_sessions').insert({
        class_id: classId,
        scheduled_at: scheduledAt.toISOString(),
        happened: false,
        cancelled: false,
        notes: `Scheduled (${context})`,
      });

      if (insertError) {
        allocationLog('regenerateSessions:insert_failed', {
          context,
          learnerId,
          classId,
          subject: meta.subject,
          week,
          error: insertError.message,
        });
        continue;
      }

      created += 1;
      allocationLog('regenerateSessions:created', {
        context,
        learnerId,
        classId,
        subject: meta.subject,
        week,
        scheduledAt: scheduledAt.toISOString(),
      });
    }
  }

  allocationLog('regenerateSessions:done', {
    context,
    learnerId,
    created,
    removed,
    classIds,
  });

  return { created, removed, classIds };
}

/**
 * Ensure each active enrollment has upcoming sessions (replaces any existing upcoming).
 */
export async function ensureSessionsForLearnerEnrollments(
  supabase: ServiceClient,
  learnerId: string,
  context: string
): Promise<{ created: number; classIds: string[] }> {
  const { created, classIds } = await regenerateSessionsForLearnerEnrollments(
    supabase,
    learnerId,
    context
  );
  return { created, classIds };
}
