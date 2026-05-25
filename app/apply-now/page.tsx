import ApplyForm from '../components/ApplyForm';
import { brand, positioning, sessionInfo } from '@/lib/site-config';
import { subjectsNotOffered } from '@/lib/trust-content';
import Link from 'next/link';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = pageMetadata({
  title: 'Apply Now',
  description: `Apply for online tutoring with ${brand.name}. Grades 6–12, small-group sessions (1:3), applications open year-round.`,
  path: '/apply-now',
});

export default function ApplyNowPage({
  searchParams,
}: {
  searchParams?: { resume?: string };
}) {
  const resumeLeadId = searchParams?.resume?.trim();

  return (
    <div className={`container mx-auto px-4 py-12 md:py-16 ${jakarta.className}`}>
      <header className='mb-10 max-w-3xl space-y-4'>
        <h1
          className={`${dmSerif.className} text-4xl text-[hsl(210,100%,25%)] md:text-5xl`}
        >
          Apply now
        </h1>
        <p className='text-lg text-muted-foreground'>
          Complete the form below to apply for {brand.tagline.toLowerCase()}.{' '}
          {positioning.intake}
        </p>
        <p className='text-sm text-muted-foreground'>
          Class ratio: {positioning.ratio}. {sessionInfo}
        </p>
        <p className='text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>Subjects offered:</span>{' '}
          Pure Maths, Physical Science, Natural Sciences, Life Sciences, and
          English only.{' '}
          <span className='font-medium text-foreground'>Not offered:</span>{' '}
          {subjectsNotOffered.join(', ')}.
        </p>
        <p className='rounded-lg border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)]/50 px-4 py-3 text-sm text-muted-foreground'>
          After you submit, you will be redirected to{' '}
          <span className='font-medium text-foreground'>PayFast</span> to pay
          securely. We do not store card details on this website. See our{' '}
          <Link href='/terms' className='text-primary hover:underline'>
            terms of enrolment
          </Link>
          .
        </p>
      </header>
      <ApplyForm resumeLeadId={resumeLeadId} />
    </div>
  );
}
