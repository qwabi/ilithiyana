import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { ApplicationDetailActions } from '@/app/components/admin/ApplicationDetailActions';
import {
  fetchApplicationById,
  getApplicationReportViewUrl,
} from '@/app/actions/admin-actions';
import { packages } from '@/lib/site-config';
import {
  formatSubjectLabels,
  resolveLearnerSubjectIds,
} from '@/lib/curriculum/learner-subjects';

type Props = { params: Promise<{ id: string }> };

export default async function ApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  const { data: app, error } = await fetchApplicationById(id);

  if (error) {
    return (
      <AdminShell title='Application' backHref='/admin/dashboard/applications'>
        <p className='text-sm text-destructive'>{error}</p>
      </AdminShell>
    );
  }

  if (!app) notFound();

  const parentSnap = app.parent_snapshot;
  const learnerSnap = app.learner_snapshot;
  const parentName = app.parents
    ? `${app.parents.first_name} ${app.parents.last_name}`
    : [parentSnap?.firstName, parentSnap?.lastName].filter(Boolean).join(' ');
  const learnerName = app.learners
    ? `${app.learners.first_name} ${app.learners.last_name}`
    : [learnerSnap?.firstName, learnerSnap?.lastName].filter(Boolean).join(' ');
  const grade = app.learners?.grade ?? Number(learnerSnap?.grade) ?? 10;
  const report = await getApplicationReportViewUrl(id);

  const pkg = packages.find((p) => p.id === app.package_id);

  return (
    <AdminShell
      title={learnerName || 'Application'}
      description={`Submitted ${format(new Date(app.created_at), 'd MMM yyyy')} · ${app.status}`}
      backHref='/admin/dashboard/applications'
      backLabel='All applications'
      actions={
        <ApplicationDetailActions applicationId={app.id} status={app.status} />
      }
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Parent</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            <p className='font-medium'>{parentName}</p>
            <p className='text-muted-foreground'>
              {app.parents?.email ?? String(parentSnap?.email ?? '—')}
            </p>
            {app.parent_id ? (
              <Link
                href={`/admin/dashboard/parents/${app.parent_id}`}
                className='text-primary hover:underline'
              >
                View parent record
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Learner</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            <p className='font-medium'>{learnerName}</p>
            <p className='text-muted-foreground'>Grade {grade}</p>
            {app.learner_id ? (
              <Link
                href={`/admin/dashboard/learners/${app.learner_id}`}
                className='text-primary hover:underline'
              >
                View learner record
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>Enrolment</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            <p>Package: {pkg?.name ?? app.package_id}</p>
            <p>Province: {app.province}</p>
            <p>
              Subjects:{' '}
              {formatSubjectLabels(
                resolveLearnerSubjectIds(app.subjects ?? [], grade),
                grade
              ).join(', ')}
            </p>
            {report.url ? (
              <p className='pt-2'>
                <a
                  href={report.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-medium text-primary hover:underline'
                >
                  View school report
                </a>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
