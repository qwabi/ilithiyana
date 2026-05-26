import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-[#F8FAFC] px-6 py-16 text-center',
        className,
      )}
    >
      <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1B6CA8]/10'>
        <Icon className='h-7 w-7 text-[#1B6CA8]' aria-hidden />
      </div>
      <h3 className='mb-1 font-semibold text-[#0F2942]'>{title}</h3>
      {description ? (
        <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      ) : null}
      {action ? (
        action.href ? (
          <Button asChild className='mt-5' variant='secondary'>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button
            type='button'
            className='mt-5'
            variant='secondary'
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
