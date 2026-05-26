import { format, differenceInMinutes } from 'date-fns';
import type { ScheduleListItem } from '@/lib/parent-dashboard-sections';

export function ScheduleCard({ item }: { item: ScheduleListItem }) {
  if (item.kind === 'session') {
    const mins = differenceInMinutes(
      new Date(item.scheduled_at),
      new Date()
    );
    const showLink =
      mins <= 30 &&
      mins >= -120 &&
      item.classInfo.meet_link &&
      !item.cancelled;

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
          {showLink ? (
            <a
              href={item.classInfo.meet_link!}
              target='_blank'
              rel='noopener noreferrer'
              className='rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground'
            >
              Join class
            </a>
          ) : (
            <span className='text-xs text-muted-foreground'>
              Link available at class time
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
        <a
          href={item.classInfo.meet_link}
          target='_blank'
          rel='noopener noreferrer'
          className='mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground'
        >
          Join class
        </a>
      ) : (
        <p className='mt-2 text-xs text-muted-foreground'>
          Meeting link coming soon
        </p>
      )}
    </div>
  );
}
