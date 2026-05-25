import Link from 'next/link';
import type { Metadata } from 'next';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { FaqSection } from '@/app/components/faq-section';
import { TestimonialsSection } from '@/app/components/testimonials-section';
import { pageMetadata, siteDescription } from '@/lib/seo';
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Leaf,
  Languages,
  Atom,
  CheckCircle,
  ClipboardList,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { HeroSection } from '@/app/components/hero-section';
import { StatsSection } from '@/app/components/stats-section';
import { AboutSection } from '@/app/components/about-section';
import { TrustSignalsSection } from '@/app/components/trust-signals-section';
import { LeadMagnetPromo } from '@/app/components/lead-magnet/LeadMagnetPromo';
import { Button } from '@/components/ui/button';
import {
  brand,
  subjects,
  packages,
  sessionInfo,
  grades,
  positioning,
} from '@/lib/site-config';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = pageMetadata({
  title: brand.tagline,
  description: siteDescription,
  path: '/',
});

const subjectIcons: Record<string, LucideIcon> = {
  'Pure Maths': Calculator,
  'Natural Sciences': FlaskConical,
  'Life Sciences': Leaf,
  English: Languages,
  'Physical Science': Atom,
};

const subjectChipStyles: Record<string, string> = {
  'Pure Maths': 'bg-blue-50 border-blue-200 text-blue-900',
  'Physical Science': 'bg-teal-50 border-teal-200 text-teal-900',
  'Life Sciences': 'bg-sky-50 border-sky-200 text-sky-900',
  English: 'bg-blue-50/90 border-blue-100 text-blue-800',
  'Natural Sciences': 'bg-teal-50/90 border-teal-100 text-teal-800',
};

const howItWorks = [
  {
    step: '1',
    title: 'Apply online',
    description:
      'Tell us about your learner, school grade, subjects, and preferred package. Upload a recent report and proof of payment.',
    icon: ClipboardList,
    href: '/apply-now',
  },
  {
    step: '2',
    title: 'Onboarding',
    description:
      'Our team reviews your application, confirms placement, and agrees class days and times with your tutor.',
    icon: Users,
  },
  {
    step: '3',
    title: 'Join classes',
    description:
      'Learners attend small-group online sessions with subject specialists and ongoing career guidance support.',
    icon: Video,
  },
];

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className='mb-12 text-center'>
      <h2
        className={`${dmSerif.className} mb-4 text-3xl text-[hsl(210,100%,25%)] md:text-4xl`}
      >
        {title}
      </h2>
      <p className='mx-auto max-w-2xl text-lg text-muted-foreground'>
        {description}
      </p>
    </div>
  );
}

export default function Home() {
  const gradeRange = `Grades ${grades[0]}–${grades[grades.length - 1]}`;

  return (
    <div className={`min-h-screen ${jakarta.className}`}>
      <HeroSection />

      <AboutSection />

      <section className='bg-white py-20'>
        <div className='container mx-auto px-4'>
          <SectionHeading
            title='Subjects we tutor'
            description={`${gradeRange} — specialist support in the subjects learners need most.`}
          />
          <div className='flex flex-wrap justify-center gap-3'>
            {subjects.map((subject) => {
              const Icon = subjectIcons[subject] ?? BookOpen;
              const chipClass =
                subjectChipStyles[subject] ??
                'bg-[hsl(210,55%,96%)] border-[hsl(214,32%,91%)] text-[hsl(210,100%,25%)]';
              return (
                <div
                  key={subject}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${chipClass}`}
                >
                  <Icon className='h-4 w-4 shrink-0' aria-hidden />
                  {subject}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className='bg-[hsl(210,55%,96%)] py-20'>
        <div className='container mx-auto px-4'>
          <SectionHeading
            title='Tutoring packages'
            description='Choose monthly support or pay per lesson for exam preparation.'
          />
          <div className='mx-auto mb-8 grid max-w-4xl gap-6 md:grid-cols-2'>
            {packages.map((pkg, index) => (
              <article
                key={pkg.id}
                className='overflow-hidden rounded-xl border border-[hsl(214,32%,91%)] bg-white'
              >
                <div
                  className={
                    index === 0
                      ? 'bg-[hsl(210,55%,96%)] px-6 py-5'
                      : 'bg-[hsl(180,45%,92%)] px-6 py-5'
                  }
                >
                  <h3
                    className={`${dmSerif.className} text-2xl text-[hsl(210,100%,25%)]`}
                  >
                    {pkg.name}
                  </h3>
                  <p className='mt-1 text-lg font-medium text-primary'>
                    {pkg.price}
                  </p>
                </div>
                <ul className='space-y-3 px-6 py-6'>
                  {pkg.features.map((feature) => (
                    <li key={feature} className='flex items-start gap-2 text-sm'>
                      <CheckCircle
                        className='mt-0.5 h-5 w-5 shrink-0 text-accent'
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className='px-6 pb-6'>
                  <Button
                    asChild
                    variant='outline'
                    className='w-full rounded-full border-primary text-primary hover:bg-[hsl(210,55%,96%)]'
                  >
                    <Link href='/apply-now'>Choose {pkg.name}</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <p className='mx-auto mb-6 max-w-2xl text-center text-sm text-muted-foreground'>
            {sessionInfo}
          </p>
        </div>
      </section>

      <section className='bg-white py-20'>
        <div className='container mx-auto px-4'>
          <SectionHeading
            title='How it works'
            description='From application to your first class — a clear path for parents and learners.'
          />
          <div className='grid gap-6 md:grid-cols-3'>
            {howItWorks.map((item) => (
              <article
                key={item.step}
                className='rounded-xl border border-[hsl(214,32%,91%)] bg-white p-6'
              >
                <span className='text-xs font-semibold uppercase tracking-wide text-primary'>
                  Step {item.step}
                </span>
                <item.icon
                  className='mt-3 mb-3 h-9 w-9 text-accent'
                  aria-hidden
                />
                <h3
                  className={`${dmSerif.className} mb-2 text-xl text-[hsl(210,100%,25%)]`}
                >
                  {item.title}
                </h3>
                <p className='text-sm text-muted-foreground'>{item.description}</p>
                {item.href ? (
                  <Button
                    asChild
                    variant='link'
                    className='mt-4 h-auto px-0 text-primary'
                  >
                    <Link href={item.href}>Start application →</Link>
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
          <p className='mt-10 text-center text-sm text-muted-foreground'>
            {positioning.ratio} · {positioning.intake}
          </p>
        </div>
      </section>

      <StatsSection />

      <TrustSignalsSection />

      <LeadMagnetPromo />

      <TestimonialsSection />

      <FaqSection />

      <section className='bg-white py-16'>
        <div className='container mx-auto px-4 text-center'>
          <h2
            className={`${dmSerif.className} mb-4 text-3xl text-[hsl(210,100%,25%)] md:text-4xl`}
          >
            Ready to enrol with {brand.name}?
          </h2>
          <p className='mx-auto mb-8 max-w-xl text-lg text-muted-foreground'>
            {gradeRange} online tutoring — applications are reviewed as they come
            in.
          </p>
          <div className='flex flex-wrap justify-center gap-4'>
            <Button
              asChild
              size='lg'
              className='rounded-full bg-secondary px-10 text-secondary-foreground hover:bg-secondary/90'
            >
              <Link href='/apply-now'>Apply now</Link>
            </Button>
            <Button
              asChild
              size='lg'
              variant='outline'
              className='rounded-full border-primary text-primary hover:bg-[hsl(210,55%,96%)]'
            >
              <Link href='/about'>About us</Link>
            </Button>
          </div>
          <div className='mt-6'>
            <LeadMagnetPromo variant='inline' />
          </div>
        </div>
      </section>
    </div>
  );
}
