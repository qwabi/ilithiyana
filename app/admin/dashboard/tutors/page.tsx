import {
  listAllTutorsForAdmin,
  listIncompleteTutorProspects,
} from '@/lib/tutor/actions';
import { TutorsAdminPanel } from '@/app/components/admin/TutorsAdminPanel';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function AdminTutorsPage() {
  const [tutorsResult, prospectsResult] = await Promise.all([
    listAllTutorsForAdmin(),
    listIncompleteTutorProspects(),
  ]);

  const initialError = tutorsResult.error ?? prospectsResult.error;

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Tutors</h1>
      <p className='mb-8 text-muted-foreground'>
        All tutor applications and vetting statuses. Filter by status, open a
        tutor to review documents, or see prospective tutors who have not
        finished signup.
      </p>
      <TutorsAdminPanel
        tutors={tutorsResult.data}
        prospects={prospectsResult.data}
        initialError={initialError}
      />
    </div>
  );
}
