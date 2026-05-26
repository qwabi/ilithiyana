import Link from 'next/link';
import { Calendar, FileText } from 'lucide-react';
import { SyncLearnerScheduleButton } from '@/app/components/dashboard/SyncLearnerScheduleButton';
import { subscriptionDisplayStatus } from '@/lib/parent-dashboard-utils';
import { cn } from '@/lib/utils';
import { formatSubjectLabels, resolveLearnerSubjectIds } from '@/lib/curriculum/learner-subjects';
import type { ChildrenPageLearner } from '@/lib/parent-dashboard-sections';

function StatusPill({ status }: { status: string }) {
  const key = subscriptionDisplayStatus(status);
  const styles =
    key === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : key === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : key === 'overdue'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-border bg-muted text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        styles
      )}
    >
      {key}
    </span>
  );
}

export function ChildCard({ learner }: { learner: ChildrenPageLearner }) {
  const subscription = learner.subscriptions[0];
  const application = learner.applications[0];
  const subjectLabels = formatSubjectLabels(
    resolveLearnerSubjectIds(learner.subjects, learner.grade),
    learner.grade
  );

  return (
    <div
      className='rounded-xl border border-border border-t-4 border-t-primary
                 bg-white p-5 shadow-sm'
    >
      <div className='mb-3 flex items-start justify-between'>
        <div>
          <h3 className='text-base font-semibold text-foreground'>
            {learner.first_name} {learner.last_name}
          </h3>
          <p className='mt-0.5 text-sm text-muted-foreground'>
            Grade {learner.grade}
            {learner.school_name ? ` · ${learner.school_name}` : ''}
          </p>
        </div>
        {subscription ? <StatusPill status={subscription.status} /> : null}
      </div>

      {subjectLabels.length > 0 ? (
        <div className='mb-4 flex flex-wrap gap-1.5'>
          {subjectLabels.map((label) => (
            <span
              key={label}
              className='rounded-full bg-[hsl(210,100%,96%)] px-2 py-0.5
                         text-xs font-medium text-[hsl(210,100%,35%)]'
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {application ? (
        <p className='mb-4 text-xs text-muted-foreground'>
          Application:{' '}
          <span className='font-medium capitalize'>{application.status}</span>
        </p>
      ) : null}

      {learner.reportCount > 0 ? (
        <p className='mb-4 text-xs text-muted-foreground'>
          {learner.reportCount} report{learner.reportCount !== 1 ? 's' : ''}
          {learner.pendingReportCount > 0
            ? ` · ${learner.pendingReportCount} awaiting confirmation`
            : ''}
        </p>
      ) : null}

      <div className='mb-3 border-t border-border pt-3'>
        <SyncLearnerScheduleButton
          learnerId={learner.id}
          learnerName={`${learner.first_name} ${learner.last_name}`}
        />
      </div>

      <div className='flex gap-4 border-t border-border pt-3'>
        <Link
          href={`/dashboard/schedules/${learner.id}`}
          className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground
                     transition-colors hover:text-primary'
        >
          <Calendar size={14} />
          Schedule
        </Link>
        <Link
          href={`/dashboard/reports/${learner.id}`}
          className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground
                     transition-colors hover:text-primary'
        >
          <FileText size={14} />
          Reports
        </Link>
      </div>
    </div>
  );
}
