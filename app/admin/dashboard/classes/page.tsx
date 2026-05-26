import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ClassesManager } from '@/app/components/admin/ClassesManager';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { fetchClasses } from '@/app/actions/admin-actions';

export default async function ClassesPage() {
  const { data, learners, tutors, error } = await fetchClasses();

  return (
    <AdminShell
      title='Class schedule'
      description='Assign subjects, tutors, and session times for each learner. Parents see their schedule in the parent portal.'
      actions={
        <Button asChild size='sm'>
          <Link href='/admin/dashboard/classes/new'>New class</Link>
        </Button>
      }
    >
      <ClassesManager
        initialClasses={data}
        learners={learners}
        tutors={tutors}
        initialError={error}
      />
    </AdminShell>
  );
}
