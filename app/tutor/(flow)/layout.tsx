import { redirect } from 'next/navigation';
import { TutorFlowHeader } from '@/app/tutor/_components/TutorFlowHeader';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getTutorSession } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

export default async function TutorFlowLayout({
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

  return (
    <div className='min-h-screen'>
      <TutorFlowHeader />
      <div className='mx-auto max-w-3xl px-4 py-8 sm:py-12'>{children}</div>
    </div>
  );
}
