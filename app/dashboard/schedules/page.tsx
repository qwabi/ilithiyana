import { redirect } from 'next/navigation';
import { EmptyState } from '@/app/components/dashboard/EmptyState';
import { PageHeader } from '@/app/components/dashboard/PageHeader';
import { ScheduleCard } from '@/app/components/dashboard/ScheduleCard';
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
        description="Your children's upcoming classes. Join links appear about 30 minutes before class time."
      />

      {items.length === 0 ? (
        <EmptyState
          icon='calendar'
          title='No classes scheduled yet'
          description="Once we process your child's report and confirm their class placement, their schedule will appear here. This usually happens within 24 hours of uploading a school report."
          action={{
            label: 'Upload a report',
            href: '/dashboard/reports',
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
