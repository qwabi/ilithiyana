import { listPendingTutorsForAdmin } from '@/lib/tutor/actions';
import { TutorVettingTable } from '@/app/components/admin/TutorVettingTable';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function AdminTutorsPage() {
  const { data, error } = await listPendingTutorsForAdmin();

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Tutor vetting</h1>
      <p className='mb-8 text-muted-foreground'>
        Review applications, documents, and approve or reject tutors.
      </p>
      <TutorVettingTable
        initialRows={data as Parameters<typeof TutorVettingTable>[0]['initialRows']}
        initialError={error}
      />
    </div>
  );
}
