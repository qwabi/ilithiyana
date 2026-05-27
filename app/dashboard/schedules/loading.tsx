import { ScheduleCardSkeleton } from '@/app/components/dashboard/skeletons/DashboardSkeleton';

export default function SchedulesLoading() {
  return (
    <div>
      <div className='mb-6 h-8 w-32 animate-pulse rounded-md bg-muted' />
      <div className='space-y-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <ScheduleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
