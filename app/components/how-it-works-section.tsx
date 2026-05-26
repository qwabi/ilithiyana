'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ClipboardList, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { StaggerChildren, StaggerItem } from '@/components/ui/StaggerChildren';
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
        <div className='lg:grid lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start lg:gap-14'>
          <div>
            <ScrollReveal className='mb-14 text-center lg:text-left'>
              <p className='overline mb-3 text-primary'>Simple process</p>
              <h2 className='font-display text-3xl text-primary-dark md:text-4xl'>
                From signup to first class{' '}
                <em className='not-italic text-secondary'>in 3 steps</em>
              </h2>
            </ScrollReveal>

            <StaggerChildren className='mx-auto grid max-w-4xl gap-6 md:grid-cols-3'>
              {steps.map((item, i) => (
                <StaggerItem key={item.step}>
                  <motion.article
                    whileHover={{ y: -6, boxShadow: '0 16px 32px rgba(0, 80, 160, 0.08)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className='relative h-full rounded-2xl border border-border bg-white p-7 transition-shadow'
                  >
                    <span
                      className='pointer-events-none absolute right-5 top-4 font-display text-8xl leading-none text-primary-light select-none'
                      aria-hidden
                    >
                      {item.step}
                    </span>

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
                      <Button
                        asChild
                        variant='link'
                        className='relative z-10 mt-4 h-auto px-0 font-semibold text-primary'
                      >
                        <Link href={item.href}>Start application →</Link>
                      </Button>
                    )}

                    {i < steps.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{
                          delay: 0.25 + i * 0.12,
                          type: 'spring',
                          stiffness: 420,
                          damping: 22,
                        }}
                        className='absolute -right-4 top-1/2 z-20 hidden -translate-y-1/2 md:block'
                      >
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-secondary shadow-md'>
                          <span className='text-sm font-bold text-secondary-foreground'>→</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.article>
                </StaggerItem>
              ))}
            </StaggerChildren>

            <ScrollReveal delay={0.15}>
              <p className='mt-10 text-center text-sm text-muted-foreground lg:text-left'>
                {positioning.ratio} · {positioning.intake}
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.1} className='relative mt-14 hidden lg:block'>
            <div className='sticky top-24'>
              <div className='absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-primary-light to-secondary-light opacity-60' />
              <div className='relative aspect-[3/4] overflow-hidden rounded-[1.75rem] border-4 border-white shadow-2xl'>
                <Image
                  src='/teacher-giving-notes-or-assingments-students-writing.jpg'
                  alt='Teacher supporting students during a lesson'
                  fill
                  className='object-cover'
                  sizes='360px'
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
