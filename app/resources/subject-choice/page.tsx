import type { Metadata } from 'next';
import { CheckCircle } from 'lucide-react';
import { SubjectChoiceForm } from '@/app/components/lead-magnet/SubjectChoiceForm';
import { pageMetadata } from '@/lib/seo';
import { brand } from '@/lib/site-config';
import { SUBJECT_CHOICE_MAGNET } from '@/lib/lead-magnets';

export const metadata: Metadata = pageMetadata({
  title: 'Free CAPS Subject Choice Checklist',
  description:
    'Free checklist for South African parents — choose the right Grade 10–12 CAPS subjects. From Ilithiyana Academics, online tutoring Grades 6–12.',
  path: SUBJECT_CHOICE_MAGNET.path,
});

const takeaways = [
  'Pure Maths, Physical Science, and Life Sciences — what to lock in before Grade 10',
  'Foundation-phase choices that affect FET options',
  'Printable action checklist to use with your school',
  'Links to NSFAS, DHET, and Careers Portal',
  'Clear note on subjects Ilithiyana does and does not tutor',
];

export default function SubjectChoiceLandingPage() {
  return (
    <div className='font-sans'>
      <div className='bg-[hsl(210,55%,96%)] py-12 md:py-16'>
        <div className='container mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-2 md:items-start'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-widest text-primary'>
              Free resource · {brand.name}
            </p>
            <h1 className='font-display mt-3 text-3xl text-[hsl(210,100%,25%)] md:text-4xl lg:text-5xl'>
              CAPS subject choice checklist
            </h1>
            <p className='mt-4 text-lg text-muted-foreground'>
              For parents of Grades 8–12 learners. Get a practical guide before
              Grade 10 selection — delivered to your inbox in seconds.
            </p>
            <ul className='mt-8 space-y-3'>
              {takeaways.map((item) => (
                <li key={item} className='flex gap-3 text-sm md:text-base'>
                  <CheckCircle
                    className='mt-0.5 h-5 w-5 shrink-0 text-accent'
                    aria-hidden
                  />
                  <span className='text-muted-foreground'>{item}</span>
                </li>
              ))}
            </ul>
            <p className='mt-8 text-sm text-muted-foreground'>
              <strong className='text-foreground'>Is it really free?</strong>{' '}
              Yes — one email with your checklist link. No payment required.
            </p>
          </div>
          <div>
            <SubjectChoiceForm />
          </div>
        </div>
      </div>
    </div>
  );
}
