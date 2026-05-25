import { TutorPortal } from '@/app/components/portal/TutorPortal';
import { getTutorPortalSession } from '@/app/actions/portal-actions';
import { brand } from '@/lib/site-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Tutor portal | ${brand.name}`,
  description: 'Submit monthly session timesheets.',
};

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl md:text-4xl font-normal tracking-tight text-foreground';

export default async function TutorPortalPage() {
  const tutor = await getTutorPortalSession();

  return (
    <div className='container mx-auto max-w-lg px-4 py-10 md:py-12'>
      <h1 className={`${pageTitle} mb-2`}>Tutor portal</h1>
      <p className='mb-8 text-muted-foreground'>
        Sign in with your tutor email to submit your monthly session log for
        payroll.
      </p>
      <TutorPortal initialTutor={tutor} />
    </div>
  );
}
