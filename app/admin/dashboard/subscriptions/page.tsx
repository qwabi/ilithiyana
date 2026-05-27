import { SubscriptionsTable } from '@/app/components/admin/SubscriptionsTable';
import { fetchSubscriptions } from '@/app/actions/admin-actions';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function SubscriptionsPage() {
  const { data, error } = await fetchSubscriptions();

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Subscriptions</h1>
      <p className='mb-8 text-muted-foreground'>
        Track learner subscription payments — paid, pending, and overdue.
      </p>
      <SubscriptionsTable initialRows={data} initialError={error} />
    </div>
  );
}
