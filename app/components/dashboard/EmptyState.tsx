'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, FileText, Calendar, CreditCard } from 'lucide-react';

const ICONS = {
  users: Users,
  'file-text': FileText,
  calendar: Calendar,
  'credit-card': CreditCard,
} as const;

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: keyof typeof ICONS;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  const Icon = ICONS[icon];

  return (
    <div className='flex flex-col items-center justify-center py-16 text-center'>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className='mb-4 flex h-14 w-14 items-center justify-center rounded-full
                   bg-[hsl(210,100%,96%)]'
      >
        <Icon className='text-[hsl(210,100%,40%)]' size={24} />
      </motion.div>
      <h3 className='mb-1 font-semibold text-foreground'>{title}</h3>
      <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      {action ? (
        <Link
          href={action.href}
          className='mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-bold
                     text-[hsl(210,100%,12%)] transition-colors hover:bg-accent/90'
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
