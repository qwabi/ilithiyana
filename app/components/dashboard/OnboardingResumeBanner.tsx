import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  getIncompleteOnboardingSession,
  resolveOnboardingResumeHref,
  resolveOnboardingResumeStepLabel,
} from '@/lib/onboarding/sessions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function OnboardingResumeBanner({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}) {
  const supabase = createServerSupabaseClient();
  const session = await getIncompleteOnboardingSession(supabase, {
    userId,
    email,
  });

  if (!session) {
    return null;
  }

  const resumeHref = resolveOnboardingResumeHref(session);
  const stepLabel = resolveOnboardingResumeStepLabel(session);

  return (
    <div
      className='mb-6 rounded-xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)]/60 px-5 py-4'
      role='status'
    >
      <p className='text-sm font-medium text-[hsl(210,100%,25%)]'>
        Complete your enrolment
      </p>
      <p className='mt-1 text-sm text-muted-foreground'>
        You have an application in progress. Continue from{' '}
        <span className='text-foreground'>{stepLabel}</span> to finish setting up
        your family account.
      </p>
      <Link
        href={resumeHref}
        className='mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'
      >
        Continue enrolment
        <ArrowRight className='h-4 w-4' aria-hidden />
      </Link>
    </div>
  );
}
