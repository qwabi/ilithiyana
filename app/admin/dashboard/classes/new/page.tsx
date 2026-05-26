import Link from 'next/link';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { ClassForm } from '@/app/components/admin/ClassForm';
import { fetchClasses } from '@/app/actions/admin-actions';
import { Button } from '@/components/ui/button';

export default async function NewClassPage() {
  const { learners, tutors, error } = await fetchClasses();

  return (
    <AdminShell
      title='New class'
      description='Assign a subject and tutor to a learner.'
      backHref='/admin/dashboard/classes'
      backLabel='All classes'
    >
      {error ? <p className='mb-4 text-sm text-destructive'>{error}</p> : null}
      <ClassForm
        learners={learners}
        tutors={tutors}
        redirectTo='/admin/dashboard/classes'
      />
      <div className='mt-6'>
        <Button variant='outline' asChild>
          <Link href='/admin/dashboard/classes'>Cancel</Link>
        </Button>
      </div>
    </AdminShell>
  );
}
