'use client';

import Image from 'next/image';
import { GraduationCap, BookOpen, Briefcase, Users } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { StaggerChildren, StaggerItem } from '@/components/ui/stagger';

const bullets = [
  { Icon: BookOpen, text: 'University applications and requirements' },
  { Icon: Briefcase, text: 'Subject choices for your career path' },
  { Icon: Users, text: 'Bursary and NSFAS guidance' },
];

export function CareerGuidanceCallout() {
  return (
    <section className="relative overflow-hidden bg-accent-light py-20 font-sans">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-secondary/20"
        aria-hidden
      />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <ScrollReveal className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-4 border-white shadow-xl">
              <Image
                src="/non-south-african-students-in-class-outside.jpg"
                alt="Learners in a group career guidance session outdoors"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </ScrollReveal>

          <div className="order-1 text-center lg:order-2 lg:text-left">
            <ScrollReveal variant="scale" className="mb-5 inline-flex">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent shadow-lg lg:mx-0">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <span className="badge-shimmer mb-4 inline-block rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-secondary-foreground">
                Included in every package — free
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.08}>
              <h2 className="font-display mb-4 text-3xl text-primary-dark md:text-4xl">
                Weekly career guidance{' '}
                <em className="not-italic text-accent-dark">every Monday</em>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <p className="mb-8 text-base leading-relaxed text-muted-foreground">
                Every Monday, all enrolled learners join a live group session. No extra cost,
                no booking required — it comes with being part of Ilithiyana.
              </p>
            </ScrollReveal>

            <StaggerChildren className="mb-8 flex flex-col gap-3 text-sm lg:items-start">
              {bullets.map(({ Icon, text }) => (
                <StaggerItem
                  key={text}
                  className="flex items-center gap-3 text-muted-foreground"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Icon className="h-4 w-4 text-accent-dark" />
                  </div>
                  {text}
                </StaggerItem>
              ))}
            </StaggerChildren>

            <ScrollReveal delay={0.15}>
              <Link
                href="/career-guidance"
                className="inline-flex items-center gap-2 rounded-full border-2 border-accent-dark px-6 py-2.5 text-sm font-bold text-accent-dark transition-colors hover:bg-accent hover:text-white"
              >
                Learn more about career guidance →
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
