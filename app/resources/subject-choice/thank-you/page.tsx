import Link from 'next/link';
import type { Metadata } from 'next';
import { Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pageMetadata } from '@/lib/seo';
import { SUBJECT_CHOICE_MAGNET } from '@/lib/lead-magnets';

export const metadata: Metadata = pageMetadata({
  title: 'Checklist on the way',
  description: 'Your CAPS subject choice checklist from Ilithiyana Academics.',
  path: SUBJECT_CHOICE_MAGNET.thankYouPath,
  noIndex: true,
});

export default function SubjectChoiceThankYouPage() {
  return (
    <div className='container mx-auto max-w-xl px-4 py-16 text-center font-sans md:py-24'>
      <div className='mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary'>
        <Mail className='h-7 w-7' aria-hidden />
      </div>
      <h1 className='font-display text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
        Check your inbox
      </h1>
      <p className='mt-4 text-lg text-muted-foreground'>
        We sent your CAPS Subject Choice Checklist. If it is not there in a few
        minutes, check spam or promotions.
      </p>
      <div className='mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center'>
        <Button
          asChild
          size='lg'
          className='rounded-full bg-primary px-8 text-white hover:bg-primary/90'
        >
          <Link href={SUBJECT_CHOICE_MAGNET.checklistPath}>
            <FileText className='mr-2 h-4 w-4' />
            Open checklist now
          </Link>
        </Button>
        <Button
          asChild
          size='lg'
          variant='outline'
          className='rounded-full border-primary text-primary'
        >
          <Link href='/apply-now'>Apply for tutoring</Link>
        </Button>
      </div>
      <p className='mt-10 text-sm text-muted-foreground'>
        On the checklist page, use <strong>Print / Save as PDF</strong> to keep
        a copy offline.
      </p>
    </div>
  );
}
