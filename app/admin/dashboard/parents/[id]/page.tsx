import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { fetchParentById } from '@/app/actions/admin-actions';

type Props = { params: Promise<{ id: string }> };

export default async function ParentDetailPage({ params }: Props) {
  const { id } = await params;
  const { data, error } = await fetchParentById(id);

  if (error) {
    return (
      <AdminShell title='Parent' backHref='/admin/dashboard/parents'>
        <p className='text-sm text-destructive'>{error}</p>
      </AdminShell>
    );
  }

  if (!data) notFound();

  const { parent, learners } = data;

  return (
    <AdminShell
      title={`${parent.first_name} ${parent.last_name}`}
      description={parent.email}
      backHref='/admin/dashboard/parents'
      backLabel='All parents'
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Contact</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            <p>{parent.phone}</p>
            <p className='text-muted-foreground'>{parent.province}</p>
            {parent.address ? (
              <p className='text-muted-foreground'>{parent.address}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Learners ({learners.length})</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {learners.length === 0 ? (
              <p className='text-muted-foreground'>No learners</p>
            ) : (
              learners.map((l) => (
                <p key={l.id}>
                  <Link
                    href={`/admin/dashboard/learners/${l.id}`}
                    className='font-medium text-primary hover:underline'
                  >
                    {l.first_name} {l.last_name}
                  </Link>
                  <span className='text-muted-foreground'> — Grade {l.grade}</span>
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
