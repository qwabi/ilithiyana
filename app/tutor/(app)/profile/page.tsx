import { TutorProfileForm } from '@/app/tutor/_components/TutorProfileForm';
import { getTutorSession } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

export default async function TutorProfilePage() {
  const session = await getTutorSession();
  if (!session) return null;

  return (
    <div className='space-y-6'>
      <div>
        <h1 className={pageTitle}>Profile</h1>
        <p className='mt-2 text-muted-foreground'>
          Update your contact details and subjects.
        </p>
      </div>
      <TutorProfileForm tutor={session.tutor} profile={session.profile} />
    </div>
  );
}
