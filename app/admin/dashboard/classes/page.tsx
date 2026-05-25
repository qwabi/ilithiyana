import { ClassesManager } from '@/app/components/admin/ClassesManager';
import { fetchClasses } from '@/app/actions/admin-actions';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function ClassesPage() {
  const { data, learners, tutors, error } = await fetchClasses();

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Class schedule</h1>
      <p className='mb-8 text-muted-foreground'>
        Assign subjects, tutors, and session times for each learner. Parents see
        their schedule in the parent portal.
      </p>
      <ClassesManager
        initialClasses={data}
        learners={learners}
        tutors={tutors}
        initialError={error}
      />
    </div>
  );
}
