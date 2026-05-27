'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type TimesheetDayEntry = {
  date: string;
  sessions: number;
};

export type TimesheetGridProps = {
  /** ISO month e.g. 2026-05 */
  month: string;
  entries?: TimesheetDayEntry[];
  onChange?: (entries: TimesheetDayEntry[]) => void;
  disabled?: boolean;
  className?: string;
  /** Max sessions per day */
  maxPerDay?: number;
};

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function buildMonthDays(month: string): string[] {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return [];
  const count = daysInMonth(y, m - 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    return `${y}-${pad(m)}-${pad(day)}`;
  });
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TimesheetGrid({
  month,
  entries = [],
  onChange,
  disabled,
  className,
  maxPerDay = 8,
}: TimesheetGridProps) {
  const days = useMemo(() => buildMonthDays(month), [month]);

  const entryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      map.set(e.date, e.sessions);
    }
    return map;
  }, [entries]);

  const totalSessions = useMemo(
    () => entries.reduce((sum, e) => sum + (e.sessions || 0), 0),
    [entries],
  );

  const updateDay = (date: string, raw: string) => {
    if (!onChange) return;
    const sessions = Math.min(
      maxPerDay,
      Math.max(0, Number.parseInt(raw, 10) || 0),
    );
    const next = new Map(entryMap);
    if (sessions === 0) {
      next.delete(date);
    } else {
      next.set(date, sessions);
    }
    onChange(
      Array.from(next.entries()).map(([d, s]) => ({ date: d, sessions: s })),
    );
  };

  const monthLabel = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return month;
    return new Date(y, m - 1, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }, [month]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <Label>Session log — {monthLabel}</Label>
          <p className='text-xs text-muted-foreground'>
            Enter sessions delivered per day (0–{maxPerDay})
          </p>
        </div>
        <p className='text-sm font-semibold text-[#1B6CA8]'>
          Total: {totalSessions} session{totalSessions === 1 ? '' : 's'}
        </p>
      </div>

      <div className='overflow-x-auto rounded-lg border border-border bg-white'>
        <div className='grid min-w-[640px] grid-cols-7 gap-px bg-border'>
          {WEEKDAY.map((d) => (
            <div
              key={d}
              className='bg-[#F8FAFC] px-2 py-2 text-center text-xs font-semibold uppercase text-muted-foreground'
            >
              {d}
            </div>
          ))}
          {(() => {
            const [y, m] = month.split('-').map(Number);
            const firstDow = new Date(y, (m ?? 1) - 1, 1).getDay();
            const cells: React.ReactNode[] = [];

            for (let i = 0; i < firstDow; i++) {
              cells.push(
                <div key={`pad-${i}`} className='min-h-[72px] bg-[#F8FAFC]/50' />,
              );
            }

            for (const date of days) {
              const dayNum = Number(date.split('-')[2]);
              const sessions = entryMap.get(date) ?? 0;
              cells.push(
                <div
                  key={date}
                  className='flex min-h-[72px] flex-col gap-1 bg-white p-2'
                >
                  <span className='text-xs font-medium text-muted-foreground'>
                    {dayNum}
                  </span>
                  <Input
                    type='number'
                    min={0}
                    max={maxPerDay}
                    value={sessions || ''}
                    placeholder='0'
                    disabled={disabled}
                    className='h-8 px-2 text-center text-sm'
                    onChange={(e) => updateDay(date, e.target.value)}
                  />
                </div>,
              );
            }

            return cells;
          })()}
        </div>
      </div>
    </div>
  );
}
