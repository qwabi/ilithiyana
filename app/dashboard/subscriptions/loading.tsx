import { SubscriptionCardSkeleton } from '@/app/components/dashboard/skeletons/DashboardSkeleton';

export default function SubscriptionsLoading() {
  return (
    <div className='mt-4 space-y-4'>
      {Array.from({ length: 3 }).map((_, i) => (
        <SubscriptionCardSkeleton key={i} />
      ))}
    </div>
  );
}
