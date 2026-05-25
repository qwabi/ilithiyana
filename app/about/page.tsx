import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { pageMetadata } from '@/lib/seo';
import { FounderJsonLd } from '@/app/components/founder-json-ld';
import { ParentExperienceSection } from '@/app/components/parent-experience-section';
import { SubjectsDetailSection } from '@/app/components/subjects-detail-section';
import { CareerGuidanceSection } from '@/app/components/career-guidance-section';
import { TestimonialsSection } from '@/app/components/testimonials-section';
import {
  brand,
  subjects,
  packages,
  grades,
  positioning,
  sessionInfo,
  contact,
} from '@/lib/site-config';
import { founder } from '@/lib/trust-content';
import { Button } from '@/components/ui/button';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'Learn about Ilithiyana Academics — online CAPS tutoring for Grades 6–12, small groups (1:3), career guidance, term reports, and founder Masande Dudula.',
  path: '/about',
});

const commitmentCards = [
  {
    title: 'Learner-centred tutoring',
    border: 'border-t-primary',
    body: (gradeRange: string) =>
      `Small online groups (${positioning.ratio}) keep sessions interactive. Tutors focus on understanding, exam readiness, and steady progress across ${gradeRange}.`,
  },
  {
    title: 'Clear structure for families',
    border: 'border-t-secondary',
    body: () =>
      'Defined packages, agreed session times, and subjects parents can plan for — so support continues beyond a single lesson when learners need it.',
  },
  {
    title: 'Pathways beyond the classroom',
    border: 'border-t-accent',
    body: () =>
      'Career guidance is built into our packages, helping learners connect school work to next steps — whether further study, trades, or other goals.',
  },
] as const;

export default function About() {
  const gradeRange = `Grades ${grades[0]}–${grades[grades.length - 1]}`;
  const subjectList = subjects.join(', ');

  return (
    <div className={`${jakarta.className}`}>
      <FounderJsonLd />
      <div className='container mx-auto px-4 py-12 md:py-16'>
        <header className='mb-12 max-w-3xl'>
          <h1
            className={`${dmSerif.className} mb-3 text-4xl text-[hsl(210,100%,25%)] md:text-5xl`}
          >
            About {brand.name}
          </h1>
          <p className='text-xl text-muted-foreground'>{brand.tagline}</p>
        </header>

        <div className='grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-12'>
          <div className='space-y-4 text-lg text-muted-foreground'>
            <p>
              {brand.name} is the online tutoring arm of {brand.legalName}{' '}
              (registered {brand.registrationNumber}, founded {founder.foundedYear}
              ). We help learners in {gradeRange} build confidence and improve
              results through live, small-group online lessons on the CAPS
              curriculum.
            </p>
            <p>
              Our mission is learner success: structured tutoring, clear
              expectations for parents, and support that fits real school
              schedules — focused help in the subjects learners need most.
            </p>
            <p>
              We teach {subjectList}. Classes run at a {positioning.ratio}{' '}
              ratio so every learner gets attention. {positioning.intake}{' '}
              {sessionInfo}
            </p>
            <p>
              <span className='font-semibold text-foreground'>
                {packages[0].name}
              </span>{' '}
              ({packages[0].price}) includes eight lesson hours plus career
              guidance each month.{' '}
              <span className='font-semibold text-foreground'>
                {packages[1].name}
              </span>{' '}
              ({packages[1].price}) suits exam preparation with flexible
              pay-per-lesson billing — both include personalised career guidance.
            </p>
            <Button
              asChild
              className='mt-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90'
            >
              <Link href='/apply-now'>Apply now for tutoring</Link>
            </Button>
          </div>
          <div className='relative aspect-[3/2] overflow-hidden rounded-2xl border border-[hsl(214,32%,91%)]'>
            <Image
              src='/students-in-class.jpg'
              alt='Learners studying online with Ilithiyana Academics'
              fill
              className='object-cover'
              sizes='(max-width: 768px) 100vw, 50vw'
            />
          </div>
        </div>

        <section className='mt-16'>
          <h2
            className={`${dmSerif.className} mb-6 text-3xl text-[hsl(210,100%,25%)]`}
          >
            Our founder
          </h2>
          <article className='flex flex-col items-start gap-6 rounded-xl border border-[hsl(214,32%,91%)] bg-white p-6 sm:flex-row sm:items-start'>
            <Image
              src={founder.image}
              alt={`${founder.name}, founder of ${brand.name}`}
              width={200}
              height={200}
              className='shrink-0 rounded-full border border-[hsl(214,32%,91%)]'
            />
            <div className='space-y-4 text-muted-foreground'>
              <h3
                className={`${dmSerif.className} text-2xl text-[hsl(210,100%,25%)]`}
              >
                {founder.name}
              </h3>
              <p className='text-sm font-medium text-primary'>
                {founder.title} · Est. {founder.foundedYear}
              </p>
              {founder.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
              <p className='text-sm'>
                Reach the team:{' '}
                <a
                  href={`mailto:${contact.email}`}
                  className='text-primary hover:underline'
                >
                  {contact.email}
                </a>{' '}
                · {contact.phone}
              </p>
            </div>
          </article>
        </section>

        <section className='mt-16'>
          <h2
            className={`${dmSerif.className} mb-6 text-3xl text-[hsl(210,100%,25%)]`}
          >
            Our commitment
          </h2>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            {commitmentCards.map((card) => (
              <article
                key={card.title}
                className={`rounded-xl border border-[hsl(214,32%,91%)] border-t-4 bg-white p-6 ${card.border}`}
              >
                <h3
                  className={`${dmSerif.className} mb-3 text-xl text-[hsl(210,100%,25%)]`}
                >
                  {card.title}
                </h3>
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  {card.body(gradeRange)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className='mt-16 rounded-2xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)] px-6 py-10 text-center'>
          <p className='mb-4 text-lg text-muted-foreground'>
            Ready to enrol? Complete the online application with your
            learner&apos;s details, grade, and subjects.
          </p>
          <div className='flex flex-wrap justify-center gap-3'>
            <Button
              asChild
              variant='outline'
              size='lg'
              className='rounded-full border-primary text-primary hover:bg-white'
            >
              <Link href='/apply-now'>View application form</Link>
            </Button>
            <Button
              asChild
              variant='ghost'
              size='lg'
              className='rounded-full text-primary'
            >
              <Link href='/career-guidance'>Career guidance</Link>
            </Button>
          </div>
        </section>
      </div>

      <ParentExperienceSection />
      <SubjectsDetailSection />
      <CareerGuidanceSection showResources={false} />
      <TestimonialsSection />
    </div>
  );
}
