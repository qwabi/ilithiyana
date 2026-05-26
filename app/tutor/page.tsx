import { redirect } from 'next/navigation';
import { getTutorSession } from '@/lib/tutor/queries';

export default async function TutorIndexPage() {
  const session = await getTutorSession();
  if (!session) {
    redirect('/tutor/login');
  }
  if (session.profile.vetting_status !== 'approved') {
    redirect('/tutor/vetting');
  }
  if (!session.profile.onboarding_complete) {
    redirect('/tutor/onboarding');
  }
  redirect('/tutor/dashboard');
}
