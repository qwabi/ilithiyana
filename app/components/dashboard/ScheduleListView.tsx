import { ScheduleCard } from '@/app/components/dashboard/ScheduleCard';
import {
  groupSessionsByDate,
  partitionScheduleItems,
  type ScheduleListItem,
} from '@/lib/schedules/display';

export function ScheduleListView({ items }: { items: ScheduleListItem[] }) {
  const { sessions, legacy } = partitionScheduleItems(items);
  const groups = groupSessionsByDate(sessions);

  return (
    <div className='space-y-8'>
      {groups.length === 0 && legacy.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No upcoming sessions.</p>
      ) : null}

      {groups.map((group) => (
        <section key={group.key}>
          <h2 className='mb-3 text-sm font-semibold text-[hsl(210,100%,25%)]'>
            {group.label}
          </h2>
          <div className='space-y-3'>
            {group.items.map((item) => (
              <ScheduleCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}

      {legacy.length > 0 ? (
        <section>
          <h2 className='mb-3 text-sm font-semibold text-[hsl(210,100%,25%)]'>
            Awaiting scheduled times
          </h2>
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
