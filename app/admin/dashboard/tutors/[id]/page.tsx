import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { TutorVettingActions } from '@/app/components/admin/TutorVettingActions';
import { fetchTutorById } from '@/app/actions/admin-actions';
import { formatSubjectLabels } from '@/lib/curriculum/learner-subjects';

type Props = { params: Promise<{ id: string }> };

export default async function TutorDetailPage({ params }: Props) {
  const { id } = await params;
  const { data, error } = await fetchTutorById(id);

  if (error) {
    return (
      <AdminShell title='Tutor' backHref='/admin/dashboard/tutors'>
        <p className='text-sm text-destructive'>{error}</p>
      </AdminShell>
    );
  }

  if (!data) notFound();

  const { tutor, profile, documents } = data;

  return (
    <AdminShell
      title={`${tutor.first_name} ${tutor.last_name}`}
      description={tutor.email}
      backHref='/admin/dashboard/tutors'
      backLabel='All tutors'
      actions={
        <TutorVettingActions
          tutorId={tutor.id}
          currentStatus={profile?.vetting_status ?? null}
        />
      }
    >
      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Profile</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1 text-sm'>
            <p>
              Session rate: R {(tutor.session_rate_cents / 100).toFixed(2)}
            </p>
            <p className='text-muted-foreground'>
              Subjects:{' '}
              {formatSubjectLabels(tutor.subjects ?? [], 10).join(', ') || '—'}
            </p>
            {profile?.province ? (
              <p className='text-muted-foreground'>Province: {profile.province}</p>
            ) : null}
            {profile?.vetting_notes ? (
              <p className='mt-2 text-muted-foreground'>
                Notes: {profile.vetting_notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className='rounded-xl border-[0.5px] border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base'>Documents ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2 text-sm'>
            {documents.length === 0 ? (
              <p className='text-muted-foreground'>No uploads</p>
            ) : (
              documents.map((doc) => (
                <p key={doc.id}>
                  <span className='capitalize'>
                    {doc.document_type.replace(/_/g, ' ')}
                  </span>
                  {doc.file_name ? ` — ${doc.file_name}` : null}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
