'use client';

import Link from 'next/link';
import { Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { StaggerChildren, StaggerItem } from '@/components/ui/stagger';
import { onboardingStartPath, packages, sessionInfo } from '@/lib/site-config';

function FeatureList({
  features,
  checkClass,
  iconClass,
  extraLabel,
  highlightExtra,
}: {
  features: readonly string[];
  checkClass: string;
  iconClass: string;
  extraLabel: string;
  highlightExtra?: { checkClass: string; iconClass: string };
}) {
  const items = [...features, extraLabel];

  return (
    <StaggerChildren className="space-y-3 px-6 py-6">
      {items.map((f, index) => {
        const isExtra = index === items.length - 1;
        const dotClass = isExtra && highlightExtra ? highlightExtra.checkClass : checkClass;
        const markClass = isExtra && highlightExtra ? highlightExtra.iconClass : iconClass;

        return (
          <StaggerItem key={f} className="flex items-start gap-3 text-sm">
            <motion.span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${dotClass}`}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Check className={`h-3 w-3 ${markClass}`} strokeWidth={3} />
            </motion.span>
            <span className="text-foreground">{f}</span>
          </StaggerItem>
        );
      })}
    </StaggerChildren>
  );
}

export function PackagesSection() {
  return (
    <section className="bg-primary-light py-24 font-sans">
      <div className="container mx-auto px-4">
        <ScrollReveal className="mb-14 text-center">
          <p className="overline mb-3 text-primary">Simple, honest pricing</p>
          <h2 className="font-display text-3xl text-primary-dark md:text-4xl">
            Choose what works{' '}
            <em className="not-italic text-secondary">for your family</em>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Monthly support or pay-per-lesson — career guidance included in both.
          </p>
        </ScrollReveal>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          <ScrollReveal delay={0.05}>
            <motion.article
              className="relative overflow-hidden rounded-2xl border-2 border-primary bg-white shadow-lg"
              whileHover={{ y: -6, boxShadow: '0 24px 48px -12px rgba(27, 108, 168, 0.25)' }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <div className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl bg-secondary px-4 py-1.5">
                <span className="flex items-center gap-1 text-xs font-bold text-secondary-foreground">
                  <Star className="h-3 w-3 fill-current" /> Recommended
                </span>
              </div>

              <div className="bg-primary-light px-6 pb-4 pt-7">
                <h3 className="font-display text-2xl text-primary-dark">{packages[0].name}</h3>
                <p className="mt-1 font-display text-3xl text-primary">{packages[0].price}</p>
                <p className="mt-1 text-xs text-muted-foreground">per learner per month</p>
              </div>

              <FeatureList
                features={packages[0].features}
                checkClass="bg-primary"
                iconClass="text-white"
                extraLabel="Weekly career guidance sessions"
                highlightExtra={{
                  checkClass: 'bg-secondary',
                  iconClass: 'text-secondary-foreground',
                }}
              />

              <div className="px-6 pb-6">
                <Button
                  asChild
                  className="w-full rounded-full bg-primary font-bold text-white hover:bg-primary/90"
                >
                  <Link href={onboardingStartPath}>Choose Package A</Link>
                </Button>
              </div>
            </motion.article>
          </ScrollReveal>

          <ScrollReveal delay={0.12}>
            <article className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className="bg-accent-light px-6 py-5">
                <span className="mb-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                  Exam prep
                </span>
                <h3 className="font-display text-2xl text-primary-dark">{packages[1].name}</h3>
                <p className="mt-1 font-display text-3xl text-accent-dark">{packages[1].price}</p>
                <p className="mt-1 text-xs text-muted-foreground">pay per lesson</p>
              </div>

              <FeatureList
                features={packages[1].features}
                checkClass="bg-accent-light"
                iconClass="text-accent-dark"
                extraLabel="Weekly career guidance sessions"
              />

              <div className="px-6 pb-6">
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-full border-2 border-accent text-accent-dark hover:bg-accent-light"
                >
                  <Link href={onboardingStartPath}>Choose Package B</Link>
                </Button>
              </div>
            </article>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.15} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">{sessionInfo}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
