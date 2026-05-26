import { redirect } from 'next/navigation';
import { AccountStepClient } from '@/components/onboarding/AccountStepClient';
import {
  getIncompleteOnboardingSession,
  onboardingStepPath,
} from '@/lib/onboarding/sessions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OnboardingAccountPage({
  searchParams,
}: {
  searchParams?: { resume?: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const open = await getIncompleteOnboardingSession(supabase, {
      userId: user.id,
      email: user.email,
    });
    if (open && open.current_step !== 'account') {
      const href = `${onboardingStepPath(open.current_step)}?session_id=${open.id}`;
      redirect(href);
    }
  }

  if (searchParams?.resume) {
    const sessionId = searchParams.resume.trim();
    if (sessionId) {
      redirect(`/onboarding/children?session_id=${sessionId}`);
    }
  }

  return <AccountStepClient />;
}
