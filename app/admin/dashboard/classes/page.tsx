import { AdminShell } from '@/app/components/admin/AdminShell';
import { ClassesManager } from '@/app/components/admin/ClassesManager';
import { fetchGroupClasses } from '@/app/actions/classes-admin';

export default async function ClassesPage() {
  const { data, error } = await fetchGroupClasses();

  return (
    <AdminShell
      title='Class groups'
      description='Shared classes by grade, subject, and performance band (A–D). Each group holds up to 8 learners.'
    >
      <ClassesManager classes={data} initialError={error} />
    </AdminShell>
  );
}
