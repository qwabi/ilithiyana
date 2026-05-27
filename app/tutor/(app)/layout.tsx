import { redirect } from 'next/navigation';
import { TutorShell } from '@/components/tutor/TutorShell';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTutorSession } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

export default async function TutorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/tutor/signup');
  }

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

  if (!session.profile.onboarding_complete) {
    redirect('/tutor/onboarding');
  }

  const tutorName = `${session.tutor.first_name} ${session.tutor.last_name}`;

  return <TutorShell tutorName={tutorName}>{children}</TutorShell>;
}
