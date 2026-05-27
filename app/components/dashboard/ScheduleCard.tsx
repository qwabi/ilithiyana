'use client';

import { format, differenceInMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import type { ScheduleListItem } from '@/lib/parent-dashboard-sections';

function JoinClassLink({ href, imminent }: { href: string; imminent: boolean }) {
  return (
    <motion.a
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground'
    >
      {imminent ? (
        <span className='mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-green-400' />
      ) : null}
      Join class
    </motion.a>
  );
}

export function ScheduleCard({ item }: { item: ScheduleListItem }) {
  if (item.kind === 'session') {
    const mins = differenceInMinutes(
      new Date(item.scheduled_at),
      new Date()
    );
    const meetLink = item.classInfo.meet_link?.trim() || null;
    const hasJoinLink = Boolean(meetLink) && !item.cancelled;
    const imminent = hasJoinLink && mins <= 5 && mins >= -120;

    return (
      <div className='rounded-xl border border-border bg-white p-4 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <p className='font-medium text-foreground'>
              {item.classInfo.subject} — Grade {item.classInfo.grade}
              {item.classInfo.bandLabel
                ? ` · ${item.classInfo.bandLabel}`
                : item.classInfo.band
                  ? ` · Band ${item.classInfo.band}`
                  : ''}
            </p>
            <p className='text-sm text-muted-foreground'>
              {item.learner.first_name} {item.learner.last_name}
            </p>
            {item.classInfo.weeklySchedule ? (
              <p className='text-sm text-muted-foreground'>
                {item.classInfo.weeklySchedule}
                {item.classInfo.tutorName
                  ? ` · ${item.classInfo.tutorName}`
                  : ''}
              </p>
            ) : null}
            <p className='text-sm text-muted-foreground'>
              {item.classInfo.weeklySchedule ? 'Next session: ' : ''}
              {format(new Date(item.scheduled_at), 'EEE d MMM · HH:mm')} SAST
              {!item.classInfo.weeklySchedule && item.classInfo.tutorName
                ? ` · ${item.classInfo.tutorName}`
                : ''}
            </p>
          </div>
          {hasJoinLink ? (
            <div className='flex flex-col items-end gap-1'>
              <JoinClassLink href={meetLink!} imminent={imminent} />
              {mins > 30 ? (
                <span className='text-xs text-muted-foreground'>
                  Link ready — join when class starts
                </span>
              ) : null}
            </div>
          ) : (
            <span className='text-xs text-muted-foreground'>
              Meeting link coming soon
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='rounded-xl border border-border bg-white p-4 shadow-sm'>
      <p className='font-medium text-foreground'>
        {item.classInfo.subject} — Grade {item.classInfo.grade}
        {item.classInfo.bandLabel
          ? ` · ${item.classInfo.bandLabel}`
          : item.classInfo.band
            ? ` · Band ${item.classInfo.band}`
            : ''}
      </p>
      <p className='text-sm text-muted-foreground'>
        {item.learner.first_name} {item.learner.last_name}
      </p>
      <p className='text-sm text-muted-foreground'>
        {item.classInfo.weeklySchedule ?? 'Schedule TBC — contact us'}
        {item.classInfo.tutorName ? ` · Tutor: ${item.classInfo.tutorName}` : ''}
      </p>
      {item.classInfo.meet_link ? (
        <motion.a
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          href={item.classInfo.meet_link}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground'
        >
          Join class
        </motion.a>
      ) : (
        <p className='mt-2 text-xs text-muted-foreground'>
          Meeting link coming soon
        </p>
      )}
    </div>
  );
}
