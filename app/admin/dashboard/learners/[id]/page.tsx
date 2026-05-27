import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { fetchLearnerById } from '@/app/actions/admin-actions';
import { formatSubjectLabels } from '@/lib/curriculum/learner-subjects';

type Props = { params: Promise<{ id: string }> };

export default async function LearnerDetailPage({ params }: Props) {
  const { id } = await params;
  const { data, error } = await fetchLearnerById(id);

  if (error) {
    return (
      <AdminShell title='Learner' backHref='/admin/dashboard/learners'>
        <p className='text-sm text-destructive'>{error}</p>
      </AdminShell>
    );
  }

  if (!data) notFound();

  const { learner, subscriptions, classes, reports } = data;
  const parent = learner.parents;

  return (
    <AdminShell
      title={`${learner.first_name} ${learner.last_name}`}
      description={`Grade ${learner.grade} · ${learner.school_name} · ${learner.status}`}
      backHref='/admin/dashboard/learners'
      backLabel='All learners'
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Guardian</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            {parent ? (
              <>
                <p>
                  <Link
                    href={`/admin/dashboard/parents/${parent.id}`}
                    className='font-medium text-primary hover:underline'
                  >
                    {parent.first_name} {parent.last_name}
                  </Link>
                </p>
                <p className='text-muted-foreground'>{parent.email}</p>
                <p className='text-muted-foreground'>{parent.phone}</p>
              </>
            ) : (
              <p className='text-muted-foreground'>No parent linked</p>
            )}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Subjects</CardTitle>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            {formatSubjectLabels(learner.subjects ?? [], learner.grade).join(', ') ||
              '—'}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>Subscriptions ({subscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {subscriptions.length === 0 ? (
              <p className='text-muted-foreground'>None</p>
            ) : (
              subscriptions.map((sub) => (
                <p key={sub.id as string}>
                  {String(sub.package_id)} —{' '}
                  <span className='capitalize'>{String(sub.status)}</span>
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>Classes ({classes.length})</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {classes.length === 0 ? (
              <p className='text-muted-foreground'>None</p>
            ) : (
              classes.map((c) => (
                <p key={c.id as string}>
                  <Link
                    href={`/admin/dashboard/classes/${c.id as string}`}
                    className='text-primary hover:underline'
                  >
                    {String(c.subject)} (Grade {String(c.grade)})
                  </Link>
                </p>
              ))
            )}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>School reports ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {reports.length === 0 ? (
              <p className='text-muted-foreground'>None</p>
            ) : (
              reports.map((r) => (
                <p key={r.id}>
                  {r.term} {r.academic_year} — OCR {r.ocr_status}
                  {r.confirmed ? ' · confirmed' : ''} ·{' '}
                  {format(new Date(r.uploaded_at), 'd MMM yyyy')}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
