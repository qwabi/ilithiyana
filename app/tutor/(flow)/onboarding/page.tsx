import { redirect } from 'next/navigation';
import { TutorOnboardingClient } from '@/app/tutor/_components/TutorOnboardingClient';
import { getTutorSession } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

export default async function TutorOnboardingPage() {
  const session = await getTutorSession();
  if (!session) {
    redirect('/tutor/signup');
  }

  if (session.profile.vetting_status === 'pending') {
    redirect('/tutor/vetting');
  }

  if (session.profile.vetting_status === 'rejected') {
    redirect('/tutor/vetting');
  }

  if (session.profile.onboarding_complete) {
    redirect('/tutor/dashboard');
  }

  return (
    <TutorOnboardingClient tutor={session.tutor} profile={session.profile} />
  );
}
