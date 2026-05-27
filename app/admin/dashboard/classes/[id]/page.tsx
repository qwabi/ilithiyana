import { notFound } from 'next/navigation';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { GroupClassDetailPanel } from '@/app/components/admin/GroupClassDetailPanel';
import {
  fetchClassAdminOptions,
  fetchGroupClassById,
} from '@/app/actions/classes-admin';

type Props = { params: Promise<{ id: string }> };

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params;
  const [{ data, error }, { learners, tutors }] = await Promise.all([
    fetchGroupClassById(id),
    fetchClassAdminOptions(),
  ]);

  if (error) {
    return (
      <AdminShell title='Class' backHref='/admin/dashboard/classes'>
        <p className='text-sm text-destructive'>{error}</p>
      </AdminShell>
    );
  }

  if (!data) notFound();

  const { cls, enrollments, enrollment_count } = data;
  const bandPart = cls.band_label ?? (cls.band ? `Band ${cls.band}` : '');

  return (
    <AdminShell
      title={`${cls.subject} — Grade ${cls.grade}`}
      description={bandPart}
      backHref='/admin/dashboard/classes'
      backLabel='All class groups'
    >
      <GroupClassDetailPanel
        cls={cls}
        enrollments={enrollments as Parameters<
          typeof GroupClassDetailPanel
        >[0]['enrollments']}
        enrollmentCount={enrollment_count}
        tutors={tutors.map((t) => ({
          id: t.id as string,
          first_name: t.first_name as string,
          last_name: t.last_name as string,
        }))}
        learners={learners.map((l) => ({
          id: l.id,
          first_name: l.first_name,
          last_name: l.last_name,
          grade: l.grade,
          school_name: l.school_name,
        }))}
      />
    </AdminShell>
  );
}
