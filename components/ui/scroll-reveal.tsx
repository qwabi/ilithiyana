'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

type ScrollRevealVariant = 'up' | 'scale' | 'fade';

const variantInitial = {
  up: { opacity: 0, y: 28 },
  scale: { opacity: 0, scale: 0.85 },
  fade: { opacity: 0 },
} as const;

const variantAnimate = {
  up: { opacity: 1, y: 0 },
  scale: { opacity: 1, scale: 1 },
  fade: { opacity: 1 },
} as const;

export type ScrollRevealProps = HTMLMotionProps<'div'> & {
  variant?: ScrollRevealVariant;
  delay?: number;
  duration?: number;
  threshold?: number;
};

export function ScrollReveal({
  children,
  className,
  variant = 'up',
  delay = 0,
  duration = 0.55,
  threshold = 0.12,
  ...props
}: ScrollRevealProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold,
    rootMargin: '0px 0px -48px 0px',
  });

  return (
    <motion.div
      ref={ref}
      initial={variantInitial[variant]}
      animate={inView ? variantAnimate[variant] : variantInitial[variant]}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
