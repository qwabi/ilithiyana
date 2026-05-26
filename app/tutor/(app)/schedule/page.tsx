import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTutorSession, getTutorClasses } from '@/lib/tutor/queries';
import { formatWeeklySchedule, BAND_SHORT } from '@/lib/schedules/format';
import type { ClassBand } from '@/lib/types/database';
import type { TutorClassWithCount } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const DAY_HEADING: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

function sortByScheduleTime(a: TutorClassWithCount, b: TutorClassWithCount) {
  const ta = a.schedule_time?.slice(0, 5) ?? '99:99';
  const tb = b.schedule_time?.slice(0, 5) ?? '99:99';
  return ta.localeCompare(tb) || a.subject.localeCompare(b.subject);
}

function groupClassesByDay(classes: TutorClassWithCount[]) {
  const byDay = new Map<string, TutorClassWithCount[]>();
  const unscheduled: TutorClassWithCount[] = [];

  for (const day of DAY_ORDER) {
    byDay.set(day, []);
  }
  for (const cls of classes) {
    const day = cls.schedule_day?.toLowerCase();
    if (day && byDay.has(day)) {
      byDay.get(day)!.push(cls);
    } else {
      unscheduled.push(cls);
    }
  }
  for (const day of DAY_ORDER) {
    byDay.get(day)!.sort(sortByScheduleTime);
  }
  unscheduled.sort(sortByScheduleTime);

  return { byDay, unscheduled };
}

function ClassGroupCard({ cls }: { cls: TutorClassWithCount }) {
  const band = cls.band as ClassBand | null;
  const schedule = formatWeeklySchedule(
    cls.schedule_day,
    cls.schedule_time,
    cls.schedule
  );

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>
          {cls.subject} — Grade {cls.grade}
          {band
            ? ` — Band ${band} (${cls.band_label ?? BAND_SHORT[band]})`
            : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-1 text-sm text-muted-foreground'>
        <p>
          {cls.enrollment_count}/{cls.max_enrollment ?? 8} learners enrolled
        </p>
        <p>{schedule ?? 'Schedule TBC'}</p>
        {cls.meet_link ? (
          <p>
            <Link
              href={cls.meet_link}
              target='_blank'
              rel='noopener noreferrer'
              className='font-medium text-primary underline-offset-4 hover:underline'
            >
              Join meeting
            </Link>
          </p>
        ) : (
          <p className='text-amber-700'>Meet link not set yet</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function TutorSchedulePage() {
  const session = await getTutorSession();
  if (!session) return null;

  const classes = await getTutorClasses(session.tutor.id).catch(() => []);
  const { byDay, unscheduled } = groupClassesByDay(classes);

  return (
    <div className='space-y-8'>
      <div>
        <h1 className={pageTitle}>Schedule</h1>
        <p className='mt-2 text-muted-foreground'>
          Your assigned class groups by day (SAST). Band A = foundation; Band D
          = advanced.
        </p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className='py-10 text-center text-sm text-muted-foreground'>
            No classes assigned yet. Once learners are placed in your groups,
            they will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-8'>
          {DAY_ORDER.map((day) => {
            const dayClasses = byDay.get(day) ?? [];
            return (
              <section key={day}>
                <h2 className='mb-3 text-lg font-semibold text-foreground'>
                  {DAY_HEADING[day]}
                </h2>
                {dayClasses.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    No classes today
                  </p>
                ) : (
                  <ul className='space-y-3'>
                    {dayClasses.map((cls) => (
                      <li key={cls.id}>
                        <ClassGroupCard cls={cls} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          {unscheduled.length > 0 ? (
            <section>
              <h2 className='mb-3 text-lg font-semibold text-foreground'>
                Schedule not set
              </h2>
              <ul className='space-y-3'>
                {unscheduled.map((cls) => (
                  <li key={cls.id}>
                    <ClassGroupCard cls={cls} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
