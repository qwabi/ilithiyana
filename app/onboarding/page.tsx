import { redirect } from 'next/navigation';
import { ONBOARDING_ACCOUNT_PATH } from '@/lib/onboarding/constants';

export default function OnboardingIndexPage() {
  redirect(ONBOARDING_ACCOUNT_PATH);
}
