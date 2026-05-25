import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { AlternativesHub } from '@/app/components/competitors/AlternativesHub';

export const metadata: Metadata = pageMetadata({
  title: 'Tutoring Alternatives in South Africa',
  description:
    'Compare Ilithiyana Academics with Superprof, Kip McGrath, Tutor Doctor, and other tutoring options for CAPS Grades 6–12 — honest alternatives guides.',
  path: '/alternatives',
});

export default function AlternativesHubPage() {
  return <AlternativesHub />;
}
