import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/app/components/dashboard/EmptyState';
import { PageHeader } from '@/app/components/dashboard/PageHeader';
import { SchedulesView } from '@/app/components/dashboard/SchedulesView';
import { SchedulesViewFallback } from '@/app/components/dashboard/SchedulesViewFallback';
import { loadParentDashboardPage } from '@/lib/load-parent-dashboard';
import { getParentSchedulesPage } from '@/lib/parent-dashboard-sections';

export const dynamic = 'force-dynamic';

export default async function LearnerSchedulePage({
  params,
}: {
  params: Promise<{ learner_id: string }>;
}) {
  const { learner_id } = await params;
  const state = await loadParentDashboardPage();

  if (state.status === 'unauthenticated') {
    redirect(`/login?from=/dashboard/schedules/${learner_id}`);
  }

  if (state.status === 'pending') {
    redirect('/dashboard');
  }

  const learner = state.data.learners.find((l) => l.id === learner_id);
  if (!learner) {
    redirect('/dashboard/schedules');
  }

  const items = await getParentSchedulesPage(state.data, learner_id);
  const learnerName = `${learner.first_name} ${learner.last_name}`;

  return (
    <div>
      <Link
        href='/dashboard/schedules'
        className='text-sm text-muted-foreground hover:underline'
      >
        ← All schedules
      </Link>
      <PageHeader
        title={`Schedule — ${learnerName}`}
        description={`Grade ${learner.grade}`}
      />

      {items.length === 0 ? (
        <EmptyState
          icon='calendar'
          title='No classes scheduled yet'
          description='Enter school report results to set class placement for this learner.'
          action={{
            label: 'Add report',
            href: `/dashboard/reports/${learner_id}/add`,
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
