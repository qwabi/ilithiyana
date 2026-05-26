'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export type StaggerChildrenProps = HTMLMotionProps<'div'> & {
  stagger?: number;
};

export function StaggerChildren({
  children,
  className,
  stagger = 0.08,
  ...props
}: StaggerChildrenProps) {
  return (
    <motion.div
      variants={{
        ...containerVariants,
        show: {
          ...containerVariants.show,
          transition: { staggerChildren: stagger, delayChildren: 0.05 },
        },
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={itemVariants} className={cn(className)} {...props}>
      {children}
    </motion.div>
  );
}
