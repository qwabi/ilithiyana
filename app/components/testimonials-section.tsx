'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { StaggerChildren, StaggerItem } from '@/components/ui/stagger';
import { testimonials } from '@/lib/trust-content';

export function TestimonialsSection() {
  if (testimonials.length === 0) {
    return (
      <section className="relative overflow-hidden bg-[hsl(210,55%,96%)] py-16 font-sans">
        <Image
          src="/senior-students-in-class-taking-notes-far-wide.jpg"
          alt=""
          fill
          className="object-cover opacity-10"
          sizes="100vw"
          aria-hidden
        />
        <div className="container relative z-10 mx-auto max-w-2xl px-4 text-center">
          <ScrollReveal>
            <h2 className="font-display mb-3 text-2xl text-[hsl(210,100%,25%)] md:text-3xl">
              Parent feedback
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We publish parent stories here with permission as they are collected.
              When you apply, you can ask to speak with a current family about
              their experience with Ilithiyana Academics.
            </p>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-[hsl(210,55%,96%)] py-20 font-sans">
      <Image
        src="/senior-students-in-class-taking-notes-far-wide.jpg"
        alt=""
        fill
        className="object-cover opacity-10"
        sizes="100vw"
        aria-hidden
      />
      <div className="container relative z-10 mx-auto px-4">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-display text-3xl text-[hsl(210,100%,25%)] md:text-4xl">
            What parents say
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.05} className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-muted-foreground">
            Feedback from families in our tutoring programme.
          </p>
        </ScrollReveal>
        <StaggerChildren className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <StaggerItem key={item.quote}>
              <motion.blockquote
                className="h-full rounded-xl border border-[hsl(214,32%,91%)] bg-white p-6"
                whileHover={{ y: -4, boxShadow: '0 12px 32px -8px rgba(15, 41, 66, 0.12)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <p className="text-sm leading-relaxed text-foreground">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <footer className="mt-4 text-xs text-muted-foreground">
                  — {item.attribution}
                  {item.province ? `, ${item.province}` : ''}
                  {item.grade ? ` · Grade ${item.grade}` : ''}
                </footer>
              </motion.blockquote>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
