import { redirect } from 'next/navigation';
import { ParentDashboard } from '@/app/components/dashboard/ParentDashboard';
import { DashboardPendingActivation } from '@/app/components/dashboard/DashboardPendingActivation';
import { loadParentDashboardPage } from '@/lib/load-parent-dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { lead?: string };
}) {
  const state = await loadParentDashboardPage();

  if (state.status === 'unauthenticated') {
    const lead = searchParams?.lead?.trim();
    redirect(
      lead ? `/login?from=/dashboard&lead=${lead}` : '/login?from=/dashboard'
    );
  }

  if (state.status === 'pending') {
    return (
      <DashboardPendingActivation
        email={state.email}
        reason={state.reason}
        message={state.message}
      />
    );
  }

  return <ParentDashboard data={state.data} />;
}
