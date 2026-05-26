'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

type ScrollRevealProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  threshold?: number;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  once = true,
  threshold = 0.12,
  ...props
}: ScrollRevealProps) {
  const { ref, inView } = useInView({ triggerOnce: once, threshold });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
