import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TutorLoginForm } from '@/components/tutor/TutorLoginForm';
import { getTutorSession } from '@/lib/tutor/queries';

export default async function TutorLoginPage() {
  const session = await getTutorSession();
  if (session) {
    if (session.profile.vetting_status !== 'approved') {
      redirect('/tutor/vetting');
    }
    if (!session.profile.onboarding_complete) {
      redirect('/tutor/onboarding');
    }
    redirect('/tutor/dashboard');
  }

  return (
    <div className='mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12'>
      <div className='mb-8 text-center'>
        <p className='text-xs font-semibold uppercase tracking-wider text-[#1B6CA8]'>
          Ilithiyana Academics
        </p>
        <h1 className='mt-2 font-[family-name:var(--font-dm-serif),serif] text-3xl text-[#0F2942]'>
          Tutor sign in
        </h1>
      </div>
      <div className='rounded-xl border border-border bg-white p-6 shadow-sm'>
        <TutorLoginForm />
      </div>
      <p className='mt-6 text-center text-sm text-muted-foreground'>
        New tutor?{' '}
        <Link href='/tutor/signup' className='font-medium text-[#1B6CA8]'>
          Apply now
        </Link>
      </p>
    </div>
  );
}
