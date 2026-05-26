import { redirect } from 'next/navigation';
import { getTutorSession } from '@/lib/tutor/queries';

export async function requireTutorAuth() {
  const session = await getTutorSession();
  if (!session) {
    redirect('/tutor/login');
  }
  return session;
}

export async function requireApprovedTutor() {
  const session = await requireTutorAuth();
  if (session.profile.vetting_status === 'pending') {
    redirect('/tutor/vetting');
  }
  if (session.profile.vetting_status === 'rejected') {
    redirect('/tutor/vetting');
  }
  if (!session.profile.onboarding_complete) {
    redirect('/tutor/onboarding');
  }
  return session;
}
