import { ChildCardSkeleton } from '@/app/components/dashboard/skeletons/DashboardSkeleton';

export default function ChildrenLoading() {
  return (
    <div>
      <div className='mb-6 flex justify-between'>
        <div className='space-y-2'>
          <div className='h-8 w-36 animate-pulse rounded-md bg-muted' />
          <div className='h-4 w-64 animate-pulse rounded-md bg-muted' />
        </div>
        <div className='h-9 w-28 animate-pulse rounded-full bg-muted' />
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <ChildCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
