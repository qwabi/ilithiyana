import { redirect } from 'next/navigation';
import { EmptyState } from '@/app/components/dashboard/EmptyState';
import { PageHeader } from '@/app/components/dashboard/PageHeader';
import { SubscriptionCard } from '@/app/components/dashboard/SubscriptionCard';
import { loadParentDashboardPage } from '@/lib/load-parent-dashboard';
import { getParentSubscriptionsPage } from '@/lib/parent-dashboard-sections';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  const state = await loadParentDashboardPage();

  if (state.status === 'unauthenticated') {
    redirect('/login?from=/dashboard/subscriptions');
  }

  if (state.status === 'pending') {
    redirect('/dashboard');
  }

  const { subscriptions } = await getParentSubscriptionsPage(state.data);

  return (
    <div>
      <PageHeader
        title='Subscriptions'
        description='Manage your active subscriptions and view payment history.'
        action={{
          label: 'Add a child',
          href: '/dashboard/children/add',
          variant: 'outline',
        }}
      />

      {subscriptions.length === 0 ? (
        <EmptyState
          icon='credit-card'
          title='No active subscriptions'
          description='Add a child to create your first subscription.'
          action={{
            label: 'Add a child',
            href: '/dashboard/children/add',
          }}
        />
      ) : (
        <div className='mt-6 space-y-4'>
          {subscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
