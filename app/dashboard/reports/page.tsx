import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmptyState } from '@/app/components/dashboard/EmptyState';
import { PageHeader } from '@/app/components/dashboard/PageHeader';
import { ReportCard } from '@/app/components/dashboard/ReportCard';
import {
  getParentReportsPage,
  resolveParentContext,
} from '@/lib/parent-dashboard-sections';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?from=/dashboard/reports');

  const ctx = await resolveParentContext(user.id);
  if (!ctx) redirect('/dashboard');

  const reports = await getParentReportsPage(ctx);

  const byLearner = reports.reduce(
    (acc, report) => {
      const key = report.learner.id;
      if (!acc[key]) {
        acc[key] = { learner: report.learner, reports: [] };
      }
      acc[key].reports.push(report);
      return acc;
    },
    {} as Record<
      string,
      {
        learner: (typeof reports)[0]['learner'];
        reports: typeof reports;
      }
    >
  );

  return (
    <div>
      <PageHeader
        title='School Reports'
        description='Upload and manage school reports for each child. Reports are scanned automatically to set class levels.'
      />

      {Object.keys(byLearner).length === 0 ? (
        <EmptyState
          icon='file-text'
          title='No reports uploaded yet'
          description='Upload a school report for any of your children to help us place them in the right class.'
          action={
            ctx.learnerIds.length > 0
              ? {
                  label: 'Go to my children',
                  href: '/dashboard/children',
                }
              : undefined
          }
        />
      ) : (
        <div className='mt-6 space-y-8'>
          {Object.values(byLearner).map(({ learner, reports: list }) => (
            <div key={learner.id}>
              <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                <h2 className='font-semibold text-foreground'>
                  {learner.first_name} {learner.last_name}
                  <span className='ml-2 text-sm font-normal text-muted-foreground'>
                    Grade {learner.grade}
                  </span>
                </h2>
                <Link
                  href={`/dashboard/reports/${learner.id}/upload`}
                  className='text-sm font-medium text-primary hover:underline'
                >
                  + Add report
                </Link>
              </div>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                {list.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
              <Link
                href={`/dashboard/reports/${learner.id}`}
                className='mt-2 inline-block text-sm text-muted-foreground hover:text-primary'
              >
                View all for {learner.first_name} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
