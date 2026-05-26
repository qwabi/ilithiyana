import Link from 'next/link';
import type { Metadata } from 'next';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import {
  Award,
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pageMetadata } from '@/lib/seo';
import { brand, contact, subjects } from '@/lib/site-config';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const TUTOR_SIGNUP = '/tutor/signup';
const TUTOR_LOGIN = '/tutor/login';

const lookingForCards = [
  {
    title: 'Qualifications',
    border: 'border-t-[#1B6CA8]',
    icon: Award,
    body: 'A relevant degree or diploma in Mathematics, Science, Life Sciences, or English',
  },
  {
    title: 'Experience',
    border: 'border-t-[#F5A623]',
    icon: BookOpen,
    body: 'Proven ability to explain concepts clearly to Grade 6–12 learners',
  },
  {
    title: 'Availability',
    border: 'border-t-[#1B6CA8]',
    icon: Calendar,
    body: 'Recurring weekly slots, Tuesday to Saturday, online via Google Meet',
  },
] as const;

const howItWorksSteps = [
  {
    step: '1',
    title: 'Apply',
    description:
      'Submit your application with qualifications and ID documents',
    Icon: ClipboardList,
    accent: 'bg-[#1B6CA8]',
  },
  {
    step: '2',
    title: 'Get vetted',
    description: 'Our team reviews your profile within 3–5 working days',
    Icon: ShieldCheck,
    accent: 'bg-[#F5A623]',
  },
  {
    step: '3',
    title: 'Start teaching',
    description: 'Get your class schedule and earn R175 per session',
    Icon: Video,
    accent: 'bg-[#1B6CA8]',
  },
] as const;

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Become a Tutor',
    description:
      'Join Ilithiyana Academics as an online tutor. Help Grade 6–12 learners across South Africa master Maths, Science and English.',
    path: '/become-a-tutor',
  }),
  title: {
    absolute: 'Become a Tutor — Ilithiyana Academics',
  },
};

export default function BecomeATutorPage() {
  return (
    <div className={`${jakarta.className}`}>
      {/* Hero */}
      <section className='relative overflow-hidden bg-white pb-16 pt-8 md:pb-20 md:pt-12'>
        <div
          className='pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#1B6CA8]/10'
          aria-hidden
        />
        <div
          className='pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#F5A623]/15'
          aria-hidden
        />

        <div className='container relative z-10 mx-auto max-w-3xl px-4 text-center md:px-6'>
          <p className='text-xs font-semibold uppercase tracking-wider text-[#1B6CA8]'>
            Join the team
          </p>
          <h1
            className={`${dmSerif.className} mt-3 text-4xl leading-tight text-[#0F2942] md:text-5xl lg:text-6xl`}
          >
            Teach. Inspire. Earn.
          </h1>
          <p className='mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground'>
            Become a tutor with {brand.name} and help Grade 6–12 students master
            Maths, Science and more.
          </p>
          <div className='mt-8 flex flex-wrap justify-center gap-3'>
            <Button
              asChild
              size='lg'
              className='rounded-full bg-[#F5A623] px-8 font-semibold text-[#0F2942] shadow-md hover:bg-[#F5A623]/90'
            >
              <Link href={TUTOR_SIGNUP}>Apply to tutor</Link>
            </Button>
            <Button
              asChild
              size='lg'
              variant='outline'
              className='rounded-full border-2 border-[#1B6CA8] px-8 text-[#1B6CA8] hover:bg-[#1B6CA8]/5'
            >
              <Link href={TUTOR_LOGIN}>Already applied? Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className='container mx-auto px-4 pb-16 md:px-6 md:pb-20'>
        {/* What we're looking for */}
        <section className='mb-16 md:mb-20'>
          <h2
            className={`${dmSerif.className} mb-8 text-center text-3xl text-[#0F2942] md:text-4xl`}
          >
            What we&apos;re looking for
          </h2>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            {lookingForCards.map((card) => (
              <article
                key={card.title}
                className={`rounded-xl border border-[hsl(214,32%,91%)] border-t-4 bg-white p-6 ${card.border}`}
              >
                <card.icon
                  className='mb-3 h-8 w-8 text-[#1B6CA8]'
                  aria-hidden
                />
                <h3
                  className={`${dmSerif.className} mb-3 text-xl text-[#0F2942]`}
                >
                  {card.title}
                </h3>
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  {card.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Subjects */}
        <section className='mb-16 md:mb-20'>
          <h2
            className={`${dmSerif.className} mb-6 text-center text-3xl text-[#0F2942] md:text-4xl`}
          >
            Subjects we need tutors for
          </h2>
          <div className='flex flex-wrap justify-center gap-3'>
            {subjects.map((subject) => (
              <span
                key={subject}
                className='rounded-full border border-[#1B6CA8]/20 bg-[#1B6CA8]/5 px-4 py-1.5 text-sm font-medium text-[#1B6CA8]'
              >
                {subject}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className='mb-16 md:mb-20'>
          <h2
            className={`${dmSerif.className} mb-8 text-center text-3xl text-[#0F2942] md:text-4xl`}
          >
            How it works
          </h2>
          <div className='mx-auto grid max-w-4xl gap-6 md:grid-cols-3'>
            {howItWorksSteps.map((item) => (
              <article
                key={item.step}
                className='relative rounded-2xl border border-[hsl(214,32%,91%)] bg-white p-7'
              >
                <span
                  className='pointer-events-none absolute right-5 top-4 font-[family-name:var(--font-display),serif] text-7xl leading-none text-[#1B6CA8]/10 select-none'
                  aria-hidden
                >
                  {item.step}
                </span>
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${item.accent} text-white`}
                >
                  <item.Icon className='h-5 w-5' aria-hidden />
                </div>
                <h3
                  className={`${dmSerif.className} mb-2 text-xl text-[#0F2942]`}
                >
                  {item.title}
                </h3>
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Earnings */}
        <section className='mb-16 md:mb-20'>
          <article className='mx-auto max-w-2xl rounded-2xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)] px-6 py-10 text-center md:px-10'>
            <GraduationCap
              className='mx-auto mb-4 h-10 w-10 text-[#1B6CA8]'
              aria-hidden
            />
            <p
              className={`${dmSerif.className} text-4xl text-[#0F2942] md:text-5xl`}
            >
              R175 per session
            </p>
            <p className='mt-4 text-muted-foreground'>
              Sessions are 1 hour each. Payment is processed monthly based on
              your submitted and approved timesheet.
            </p>
            <p className='mt-3 text-sm text-muted-foreground'>
              Classes run in small groups of up to 3 learners — no large
              classrooms.
            </p>
          </article>
        </section>
      </div>

      {/* CTA band */}
      <section className='bg-[#0F2942] px-4 py-14 text-center text-white md:py-16'>
        <div className='container mx-auto max-w-2xl'>
          <h2
            className={`${dmSerif.className} text-3xl md:text-4xl`}
          >
            Ready to make a difference?
          </h2>
          <div className='mt-8'>
            <Button
              asChild
              size='lg'
              className='rounded-full bg-[#F5A623] px-10 font-semibold text-[#0F2942] hover:bg-[#F5A623]/90'
            >
              <Link href={TUTOR_SIGNUP}>Apply now</Link>
            </Button>
          </div>
          <p className='mt-6 text-sm text-white/80'>
            Questions? Email us at{' '}
            <a
              href={`mailto:${contact.email}`}
              className='font-medium text-[#F5A623] underline-offset-2 hover:underline'
            >
              {contact.email}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
