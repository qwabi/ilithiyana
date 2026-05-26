'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleCard } from '@/app/components/dashboard/ScheduleCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  partitionScheduleItems,
  sessionsByDay,
  subjectAbbrev,
  subjectDotClass,
  type ScheduleListItem,
  type ScheduleSessionItem,
} from '@/lib/schedules/display';

const WEEK_STARTS_ON = 1 as const;

export function ScheduleCalendarView({ items }: { items: ScheduleListItem[] }) {
  const { sessions, legacy } = partitionScheduleItems(items);
  const byDay = useMemo(() => sessionsByDay(sessions), [sessions]);

  const initialMonth = useMemo(() => {
    if (sessions.length === 0) return startOfMonth(new Date());
    return startOfMonth(parseISO(sessions[0].scheduled_at));
  }, [sessions]);

  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<Date>(() => {
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    if (byDay.has(todayKey)) return today;
    if (sessions.length > 0) {
      return startOfMonth(parseISO(sessions[0].scheduled_at));
    }
    return today;
  });

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedKey = format(selected, 'yyyy-MM-dd');
  const selectedSessions: ScheduleSessionItem[] = byDay.get(selectedKey) ?? [];

  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className='space-y-6'>
      <div className='rounded-xl border border-border bg-white p-4 shadow-sm sm:p-6'>
        <div className='mb-4 flex items-center justify-between gap-2'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label='Previous month'
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <h2 className='text-base font-semibold text-[hsl(210,100%,25%)]'>
            {format(month, 'MMMM yyyy')}
          </h2>
          <Button
            type='button'
            variant='outline'
            size='icon'
            aria-label='Next month'
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>

        <div className='grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border'>
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className='bg-muted/60 px-1 py-2 text-center text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs'
            >
              {label}
            </div>
          ))}

          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const daySessions = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, month);
            const isSelected = isSameDay(day, selected);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={key}
                type='button'
                onClick={() => setSelected(day)}
                className={cn(
                  'min-h-[4.5rem] bg-white p-1 text-left transition-colors sm:min-h-[5.5rem] sm:p-1.5',
                  !inMonth && 'bg-muted/30 text-muted-foreground',
                  isSelected && 'ring-2 ring-inset ring-primary',
                  !isSelected && 'hover:bg-[hsl(210,100%,98%)]'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday && 'bg-primary text-primary-foreground',
                    !isToday && inMonth && 'text-foreground',
                    !inMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div className='mt-1 space-y-0.5'>
                  {daySessions.slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      className='flex items-center gap-1 truncate rounded px-0.5 py-0.5 text-[0.6rem] leading-tight text-foreground sm:text-[0.65rem]'
                      title={`${s.classInfo.subject} · ${s.learner.first_name}`}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          subjectDotClass(s.classInfo.subject)
                        )}
                      />
                      <span className='truncate'>
                        {subjectAbbrev(s.classInfo.subject)}
                      </span>
                    </div>
                  ))}
                  {daySessions.length > 3 ? (
                    <p className='text-[0.6rem] text-muted-foreground'>
                      +{daySessions.length - 3} more
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <section>
        <h3 className='mb-3 text-sm font-semibold text-[hsl(210,100%,25%)]'>
          {format(selected, 'EEEE, d MMMM yyyy')}
        </h3>
        {selectedSessions.length === 0 ? (
          <p className='rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground'>
            No classes on this day.
          </p>
        ) : (
          <div className='space-y-3'>
            {selectedSessions.map((item) => (
              <ScheduleCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {legacy.length > 0 ? (
        <section>
          <h3 className='mb-3 text-sm font-semibold text-[hsl(210,100%,25%)]'>
            Awaiting scheduled times
          </h3>
          <div className='space-y-3'>
            {legacy.map((item) => (
              <ScheduleCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
