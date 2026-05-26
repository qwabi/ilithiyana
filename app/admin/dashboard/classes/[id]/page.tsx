import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { ClassForm } from '@/app/components/admin/ClassForm';
import { fetchClassById, fetchClasses } from '@/app/actions/admin-actions';

type Props = { params: Promise<{ id: string }> };

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ data: cls, error }, { learners, tutors }] = await Promise.all([
    fetchClassById(id),
    fetchClasses(),
  ]);

  if (error) {
    return (
      <AdminShell title='Class' backHref='/admin/dashboard/classes'>
        <p className='text-sm text-destructive'>{error}</p>
      </AdminShell>
    );
  }

  if (!cls) notFound();

  const learner = cls.learners as {
    id: string;
    first_name: string;
    last_name: string;
  } | null;

  return (
    <AdminShell
      title={`${cls.subject} — Grade ${cls.grade}`}
      description={
        learner
          ? `${learner.first_name} ${learner.last_name}`
          : 'Edit class assignment'
      }
      backHref='/admin/dashboard/classes'
      backLabel='All classes'
      actions={
        learner ? (
          <Link
            href={`/admin/dashboard/learners/${learner.id}`}
            className='text-sm font-medium text-primary hover:underline'
          >
            View learner
          </Link>
        ) : null
      }
    >
      <ClassForm
        learners={learners}
        tutors={tutors}
        initial={{
          id: cls.id as string,
          learner_id: cls.learner_id as string,
          tutor_id: cls.tutor_id as string | null,
          subject: cls.subject as string,
          grade: cls.grade as number,
          level: (cls.level as string | null) ?? null,
          schedule: (cls.schedule as string | null) ?? null,
          meet_link: (cls.meet_link as string | null) ?? null,
        }}
        redirectTo={`/admin/dashboard/classes/${id}`}
      />
    </AdminShell>
  );
}
