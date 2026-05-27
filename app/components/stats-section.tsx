'use client';

import Image from 'next/image';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { StaggerChildren, StaggerItem } from '@/components/ui/StaggerChildren';

function AnimatedCounter({ value }: { value: number }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.35 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const duration = 1100;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <span ref={ref} className='tabular-nums'>
      {count}
    </span>
  );
}

const stats = [
  { kind: 'scale' as const, display: '1:3', label: 'Max tutor-to-learner ratio' },
  { kind: 'scale' as const, display: '6–12', label: 'Grades we support' },
  { kind: 'counter' as const, value: 5, label: 'Core subjects offered' },
  { kind: 'counter' as const, value: 9, label: 'South African provinces' },
] as const;

export function StatsSection() {
  return (
    <section className='relative overflow-hidden bg-secondary py-16 font-sans'>
      {/* Decorative photos — desktop only */}
      <div
        className='pointer-events-none absolute left-0 top-1/2 z-0 hidden -translate-y-1/2 lg:block'
        aria-hidden
      >
        <div className='relative h-48 w-36 -translate-x-1/4 overflow-hidden rounded-2xl border-4 border-white/80 shadow-xl opacity-90'>
          <Image
            src='/black-n-white-student-raising-hand.jpg'
            alt=''
            fill
            className='object-cover grayscale'
            sizes='144px'
          />
        </div>
      </div>
      <div
        className='pointer-events-none absolute right-0 top-1/2 z-0 hidden -translate-y-1/2 lg:block'
        aria-hidden
      >
        <div className='relative h-48 w-36 translate-x-1/4 overflow-hidden rounded-2xl border-4 border-white/80 shadow-xl opacity-90'>
          <Image
            src='/student-holding-laptop.jpg'
            alt=''
            fill
            className='object-cover'
            sizes='144px'
          />
        </div>
      </div>

      <div className='container relative z-10 mx-auto px-4'>
        <p className='mb-10 text-center text-xs font-bold uppercase tracking-widest text-secondary-foreground/60'>
          The Ilithiyana difference
        </p>

        <StaggerChildren className='grid grid-cols-2 gap-6 md:grid-cols-4'>
          {stats.map((stat) => (
            <StaggerItem key={stat.label} scale={stat.kind === 'scale'}>
              <div className='text-center'>
                <p className='font-display text-5xl leading-none text-primary-dark md:text-6xl'>
                  {stat.kind === 'counter' ? (
                    <AnimatedCounter value={stat.value} />
                  ) : (
                    stat.display
                  )}
                </p>
                <p className='mt-3 text-sm font-semibold text-secondary-foreground/75'>
                  {stat.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <p className='mt-10 text-center text-xs text-secondary-foreground/50'>
          Ilithiyana (Pty) Ltd · Reg. 2020/652431/07 · POPIA compliant
        </p>
      </div>
    </section>
  );
}
