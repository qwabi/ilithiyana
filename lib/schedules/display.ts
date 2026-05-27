import {
  format,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { ScheduleListItem } from '@/lib/parent-dashboard-sections';

export type ScheduleSessionItem = Extract<ScheduleListItem, { kind: 'session' }>;
export type ScheduleLegacyItem = Extract<ScheduleListItem, { kind: 'legacy' }>;

export function partitionScheduleItems(items: ScheduleListItem[]) {
  const sessions: ScheduleSessionItem[] = [];
  const legacy: ScheduleLegacyItem[] = [];
  for (const item of items) {
    if (item.kind === 'session') sessions.push(item);
    else legacy.push(item);
  }
  return { sessions, legacy };
}

export function dayKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

export function sessionsByDay(
  sessions: ScheduleSessionItem[]
): Map<string, ScheduleSessionItem[]> {
  const map = new Map<string, ScheduleSessionItem[]>();
  for (const session of sessions) {
    const key = dayKey(session.scheduled_at);
    const list = map.get(key) ?? [];
    list.push(session);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }
  return map;
}

export function groupSessionsByDate(sessions: ScheduleSessionItem[]) {
  const groups: { key: string; label: string; items: ScheduleSessionItem[] }[] =
    [];
  const byDay = sessionsByDay(sessions);
  const keys = [...byDay.keys()].sort();

  for (const key of keys) {
    const items = byDay.get(key)!;
    const date = startOfDay(parseISO(`${key}T12:00:00`));
    let label: string;
    if (isToday(date)) label = 'Today';
    else if (isTomorrow(date)) label = 'Tomorrow';
    else label = format(date, 'EEEE, d MMMM yyyy');

    groups.push({ key, label, items });
  }

  return groups;
}

const SUBJECT_DOT: Record<string, string> = {
  'Pure Maths': 'bg-[hsl(210,100%,35%)]',
  'Pure Mathematics': 'bg-[hsl(210,100%,35%)]',
  English: 'bg-[hsl(180,100%,35%)]',
  'Natural Sciences': 'bg-[hsl(142,76%,36%)]',
  'Physical Science': 'bg-[hsl(38,92%,45%)]',
  'Physical Sciences': 'bg-[hsl(38,92%,45%)]',
  'Life Sciences': 'bg-[hsl(280,60%,45%)]',
};

export function subjectDotClass(subject: string): string {
  return SUBJECT_DOT[subject] ?? 'bg-primary';
}

export function subjectAbbrev(subject: string): string {
  if (subject.length <= 10) return subject;
  const words = subject.split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  }
  return subject.slice(0, 3);
}
