import { Skeleton } from '@/components/ui/skeleton';

export default function TutorDashboardLoading() {
  return (
    <div className='space-y-8'>
      <Skeleton className='h-9 w-48' />
      <div className='grid gap-4 sm:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className='h-28 rounded-xl' />
        ))}
      </div>
      <div className='flex gap-3'>
        <Skeleton className='h-10 w-36 rounded-full' />
        <Skeleton className='h-10 w-32 rounded-full' />
      </div>
    </div>
  );
}
