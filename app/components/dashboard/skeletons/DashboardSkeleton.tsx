import { Skeleton } from '@/components/ui/skeleton';

export function ParentDashboardSkeleton() {
  return (
    <div className='space-y-8'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-4 w-72' />
        <div className='mt-3 flex gap-2'>
          <Skeleton className='h-7 w-28 rounded-full' />
          <Skeleton className='h-7 w-28 rounded-full' />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-20 rounded-xl' />
        ))}
      </div>
    </div>
  );
}

export function ChildCardSkeleton() {
  return (
    <div className='space-y-3 rounded-xl border border-border bg-white p-5 shadow-sm'>
      <div className='flex justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-5 w-36' />
          <Skeleton className='h-4 w-24' />
        </div>
        <Skeleton className='h-6 w-16 rounded-full' />
      </div>
      <div className='flex gap-2'>
        <Skeleton className='h-6 w-20 rounded-full' />
        <Skeleton className='h-6 w-24 rounded-full' />
      </div>
      <Skeleton className='h-px w-full' />
      <div className='flex gap-4'>
        <Skeleton className='h-4 w-20' />
        <Skeleton className='h-4 w-16' />
      </div>
    </div>
  );
}

export function ScheduleCardSkeleton() {
  return (
    <div className='rounded-xl border border-border bg-white p-4 shadow-sm'>
      <div className='flex justify-between'>
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-5 w-48' />
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-4 w-40' />
        </div>
        <Skeleton className='h-9 w-24 rounded-full' />
      </div>
    </div>
  );
}

export function SubscriptionCardSkeleton() {
  return (
    <div className='rounded-xl border border-border bg-white shadow-sm'>
      <div className='space-y-3 p-6'>
        <div className='flex justify-between'>
          <Skeleton className='h-5 w-32' />
          <Skeleton className='h-6 w-16 rounded-full' />
        </div>
        <Skeleton className='h-4 w-48' />
        <Skeleton className='h-4 w-36' />
      </div>
    </div>
  );
}

export function PageSkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className='mt-6 space-y-4'>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className='h-24 w-full rounded-xl' />
      ))}
    </div>
  );
}
