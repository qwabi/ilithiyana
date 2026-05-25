import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/app/components/dashboard/EmptyState';
import { PageHeader } from '@/app/components/dashboard/PageHeader';
import { ScheduleCard } from '@/app/components/dashboard/ScheduleCard';
import { loadParentDashboardPage } from '@/lib/load-parent-dashboard';
import { getParentSchedulesPage } from '@/lib/parent-dashboard-sections';

export const dynamic = 'force-dynamic';

export default async function LearnerSchedulePage({
  params,
}: {
  params: { learner_id: string };
}) {
  const state = await loadParentDashboardPage();

  if (state.status === 'unauthenticated') {
    redirect(`/login?from=/dashboard/schedules/${params.learner_id}`);
  }

  if (state.status === 'pending') {
    redirect('/dashboard');
  }

  const learner = state.data.learners.find((l) => l.id === params.learner_id);
  if (!learner) {
    redirect('/dashboard/schedules');
  }

  const items = await getParentSchedulesPage(state.data, params.learner_id);
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
          description='Upload and confirm a school report to set class placement for this learner.'
          action={{
            label: 'Upload report',
            href: `/dashboard/reports/${params.learner_id}/upload`,
          }}
        />
      ) : (
        <div className='mt-6 space-y-4'>
          {items.map((item) => (
            <ScheduleCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
