import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/app/components/dashboard/EmptyState';
import { PageHeader } from '@/app/components/dashboard/PageHeader';
import { SchedulesView } from '@/app/components/dashboard/SchedulesView';
import { SchedulesViewFallback } from '@/app/components/dashboard/SchedulesViewFallback';
import { loadParentDashboardPage } from '@/lib/load-parent-dashboard';
import { getParentSchedulesPage } from '@/lib/parent-dashboard-sections';

export const dynamic = 'force-dynamic';

export default async function SchedulesPage() {
  const state = await loadParentDashboardPage();

  if (state.status === 'unauthenticated') {
    redirect('/login?from=/dashboard/schedules');
  }

  if (state.status === 'pending') {
    redirect('/dashboard');
  }

  const items = await getParentSchedulesPage(state.data);

  return (
    <div>
      <PageHeader
        title='Class Schedules'
        description="Your children's upcoming classes. Use the join link when your tutor has shared one for the class."
      />

      {items.length === 0 ? (
        <EmptyState
          icon='calendar'
          title='No classes scheduled yet'
          description="Once we process your child's report results and confirm their class placement, their schedule will appear here. Add a report from the Reports section when you have new term marks."
          action={{
            label: 'Add a report',
            href: '/dashboard/reports',
          }}
        />
      ) : (
        <Suspense fallback={<SchedulesViewFallback />}>
          <SchedulesView items={items} />
        </Suspense>
      )}
    </div>
  );
}
