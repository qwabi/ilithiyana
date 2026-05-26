import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { ONBOARDING_ACCOUNT_PATH } from '@/lib/onboarding/sessions';

export const metadata: Metadata = pageMetadata({
  title: 'Apply Now',
  description:
    'Start enrolment with Ilithiyana Academics — online tutoring for Grades 6–12.',
  path: '/apply-now',
});

export default function ApplyNowPage({
  searchParams,
}: {
  searchParams?: { resume?: string };
}) {
  const resume = searchParams?.resume?.trim();
  const destination = resume
    ? `${ONBOARDING_ACCOUNT_PATH}?resume=${encodeURIComponent(resume)}`
    : ONBOARDING_ACCOUNT_PATH;
  redirect(destination);
}
