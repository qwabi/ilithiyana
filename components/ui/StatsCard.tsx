import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export type StatsCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
};

export function StatsCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        'border-[0.5px] border-border bg-white shadow-sm',
        className,
      )}
    >
      <CardContent className='flex items-start justify-between gap-4 p-5'>
        <div className='space-y-1'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            {label}
          </p>
          <p className='font-display text-3xl text-[#0F2942]'>{value}</p>
          {hint ? (
            <p className='text-xs text-muted-foreground'>{hint}</p>
          ) : null}
          {trend ? (
            <p
              className={cn(
                'text-xs font-medium',
                trend.positive ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {trend.value}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1B6CA8]/10'>
            <Icon className='h-5 w-5 text-[#1B6CA8]' aria-hidden />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
