import Link from 'next/link';
import { ClipboardList, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onboardingStartPath, positioning } from '@/lib/site-config';

const steps = [
  {
    step: '1',
    title: 'Apply online',
    description:
      'Tell us about your learner, school grade, subjects, and preferred package. Takes about 5 minutes.',
    Icon: ClipboardList,
    iconBg: 'bg-secondary',
    href: onboardingStartPath,
  },
  {
    step: '2',
    title: 'We confirm placement',
    description:
      'Our team reviews your application, confirms the right class level, and agrees days and times with your tutor.',
    Icon: Users,
    iconBg: 'bg-primary',
    href: null,
  },
  {
    step: '3',
    title: 'Join classes',
    description:
      'Learners attend small-group sessions online with subject specialists. Career guidance every Monday, free.',
    Icon: Video,
    iconBg: 'bg-accent',
    href: null,
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id='how-it-works' className='bg-white py-24 font-sans'>
      <div className='container mx-auto px-4'>

        {/* Heading */}
        <div className='mb-14 text-center'>
          <p className='overline mb-3 text-primary'>Simple process</p>
          <h2 className='font-display text-3xl text-primary-dark md:text-4xl'>
            From signup to first class{' '}
            <em className='not-italic text-secondary'>in 3 steps</em>
          </h2>
        </div>

        {/* Steps grid */}
        <div className='mx-auto grid max-w-4xl gap-6 md:grid-cols-3'>
          {steps.map((item, i) => (
            <article
              key={item.step}
              className='relative rounded-2xl border border-border bg-white p-7 hover:shadow-md transition-shadow'
            >
              {/* Giant step number watermark */}
              <span
                className='pointer-events-none absolute right-5 top-4 font-display text-8xl leading-none text-primary-light select-none'
                aria-hidden
              >
                {item.step}
              </span>

              {/* Icon in coloured circle */}
              <div
                className={`relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${item.iconBg}`}
              >
                <item.Icon className='h-7 w-7 text-white' aria-hidden />
              </div>

              <h3 className='relative z-10 font-display mb-2 text-xl text-primary-dark'>
                {item.title}
              </h3>
              <p className='relative z-10 text-sm leading-relaxed text-muted-foreground'>
                {item.description}
              </p>

              {item.href && (
                <Button asChild variant='link' className='relative z-10 mt-4 h-auto px-0 text-primary font-semibold'>
                  <Link href={item.href}>Start application →</Link>
                </Button>
              )}

              {/* Connector arrow — desktop only, not on last step */}
              {i < steps.length - 1 && (
                <div className='absolute -right-4 top-1/2 z-20 hidden -translate-y-1/2 md:block'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-secondary shadow-md'>
                    <span className='text-secondary-foreground text-sm font-bold'>→</span>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        <p className='mt-10 text-center text-sm text-muted-foreground'>
          {positioning.ratio} · {positioning.intake}
        </p>
      </div>
    </section>
  );
}
