import Link from 'next/link';
import { TutorSignupClient } from '@/app/tutor/_components/TutorSignupClient';

export default function TutorSignupPage() {
  return (
    <div className='mx-auto max-w-lg px-4 py-12'>
      <div className='mb-8 text-center'>
        <p className='text-xs font-semibold uppercase tracking-wider text-[#1B6CA8]'>
          Ilithiyana Academics
        </p>
        <h1 className='mt-2 font-[family-name:var(--font-dm-serif),serif] text-3xl text-[#0F2942]'>
          Apply to tutor
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Upload your documents for vetting. We will email you when your application is reviewed.
        </p>
      </div>
      <TutorSignupClient />
      <p className='mt-6 text-center text-sm text-muted-foreground'>
        Already have an account?{' '}
        <Link href='/tutor/login' className='font-medium text-[#1B6CA8]'>
          Sign in
        </Link>
      </p>
    </div>
  );
}
