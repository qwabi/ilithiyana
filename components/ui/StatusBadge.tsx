import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
  {
    variants: {
      status: {
        pending: 'border-amber-200 bg-amber-50 text-amber-800',
        active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        rejected: 'border-red-200 bg-red-50 text-red-800',
        cancelled: 'border-slate-200 bg-slate-50 text-slate-600',
        draft: 'border-slate-200 bg-slate-50 text-slate-600',
        submitted: 'border-[#1B6CA8]/30 bg-[#1B6CA8]/10 text-[#1B6CA8]',
        inactive: 'border-slate-200 bg-slate-100 text-slate-500',
      },
    },
    defaultVariants: {
      status: 'pending',
    },
  },
);

export type StatusKind =
  | 'pending'
  | 'active'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'draft'
  | 'submitted'
  | 'inactive';

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: StatusKind;
  label?: string;
}

export function StatusBadge({
  status,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}
