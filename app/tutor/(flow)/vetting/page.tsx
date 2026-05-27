import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TutorVettingPendingClock } from '@/app/tutor/_components/TutorVettingPendingClock';
import { TutorVettingStatusBanner } from '@/app/tutor/_components/TutorVettingStatus';
import { getTutorSession } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

export default async function TutorVettingPage() {
  const session = await getTutorSession();
  if (!session) {
    redirect('/tutor/signup');
  }

  const { profile, tutor } = session;

  if (profile.vetting_status === 'approved' && !profile.onboarding_complete) {
    redirect('/tutor/onboarding');
  }

  if (profile.vetting_status === 'approved' && profile.onboarding_complete) {
    redirect('/tutor/dashboard');
  }

  const statusCopy = {
    pending: {
      title: 'Application under review',
      body: 'We received your documents and qualifications. Our team typically completes vetting within 3–5 working days. You will receive an email when there is an update.',
      tone: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    rejected: {
      title: 'Application not approved',
      body:
        profile.vetting_notes ??
        'Unfortunately we cannot proceed with your application at this time. Contact us if you have questions.',
      tone: 'text-red-700 bg-red-50 border-red-200',
    },
    approved: {
      title: 'Approved',
      body: 'Your application was approved.',
      tone: 'text-green-700 bg-green-50 border-green-200',
    },
  } as const;

  const copy = statusCopy[profile.vetting_status];

  return (
    <div className='space-y-6'>
      {profile.vetting_status === 'pending' ? <TutorVettingPendingClock /> : null}
      <div>
        <h1 className='[font-family:var(--font-dm-serif),serif] text-3xl text-[hsl(210,100%,25%)]'>
          {copy.title}
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          {tutor.first_name} {tutor.last_name} · {tutor.email}
        </p>
      </div>

      <TutorVettingStatusBanner copy={copy} />

      {profile.vetting_status === 'pending' ? (
        <p className='text-sm text-muted-foreground'>
          Need to update documents? Email{' '}
          <a href='mailto:info@ilithiyana.co.za' className='text-primary underline'>
            info@ilithiyana.co.za
          </a>
          .
        </p>
      ) : null}

      {profile.vetting_status === 'rejected' ? (
        <Button asChild variant='outline'>
          <Link href='/tutor/signup'>Return to sign up</Link>
        </Button>
      ) : null}
    </div>
  );
}
