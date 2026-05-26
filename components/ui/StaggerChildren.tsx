'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const staggerScaleVariants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

type StaggerChildrenProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  threshold?: number;
};

export function StaggerChildren({
  children,
  className,
  once = true,
  threshold = 0.1,
  ...props
}: StaggerChildrenProps) {
  const { ref, inView } = useInView({ triggerOnce: once, threshold });

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial='hidden'
      animate={inView ? 'show' : 'hidden'}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode;
  className?: string;
  scale?: boolean;
};

export function StaggerItem({
  children,
  className,
  scale = false,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div
      variants={scale ? staggerScaleVariants : staggerItemVariants}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
