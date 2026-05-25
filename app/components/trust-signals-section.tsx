import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { positioning } from '@/lib/site-config';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
});

const accentBorders = [
  'border-t-primary',
  'border-t-secondary',
  'border-t-accent',
  'border-t-[hsl(199,100%,62%)]',
] as const;

const trustSignals = [
  {
    title: 'Small online classes',
    description: `Learners study in focused groups with a ${positioning.ratio} setup so tutors can track progress.`,
  },
  {
    title: 'Term progress reports',
    description:
      'Parents receive term reports on strengths, gaps, and what to focus on next — not just lesson attendance.',
  },
  {
    title: 'Career guidance included',
    description:
      'Weekly Monday sessions on university applications, subject choices, and bursaries — part of every package.',
  },
  {
    title: 'Open intake',
    description: positioning.intake,
  },
];

export function TrustSignalsSection() {
  return (
    <section className={`bg-white py-20 ${jakarta.className}`}>
      <div className='container mx-auto px-4'>
        <h2
          className={`${dmSerif.className} mb-4 text-center text-3xl text-[hsl(210,100%,25%)] md:text-4xl`}
        >
          Why families choose Ilithiyana Academics
        </h2>
        <p className='mx-auto mb-12 max-w-2xl text-center text-muted-foreground'>
          Practical online tutoring built for school schedules and steady
          academic growth.
        </p>
        <div className='mx-auto grid max-w-4xl gap-6 sm:grid-cols-2'>
          {trustSignals.map((signal, index) => (
            <article
              key={signal.title}
              className={`rounded-xl border border-[hsl(214,32%,91%)] border-t-4 bg-white p-6 ${accentBorders[index]}`}
            >
              <h3
                className={`${dmSerif.className} mb-2 text-xl text-[hsl(210,100%,25%)]`}
              >
                {signal.title}
              </h3>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                {signal.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
