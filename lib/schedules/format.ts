const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/** Human-readable weekly slot from structured class fields. */
export function formatWeeklySchedule(
  scheduleDay: string | null | undefined,
  scheduleTime: string | null | undefined,
  legacySchedule?: string | null
): string | null {
  if (scheduleDay) {
    const day = DAY_LABELS[scheduleDay.toLowerCase()] ?? scheduleDay;
    const time = scheduleTime?.slice(0, 5) ?? '18:00';
    return `Every ${day} at ${time} SAST`;
  }
  if (legacySchedule?.trim()) return legacySchedule.trim();
  return null;
}

export const BAND_SHORT: Record<string, string> = {
  A: 'Foundation',
  B: 'Developing',
  C: 'Competent',
  D: 'Advanced',
};
