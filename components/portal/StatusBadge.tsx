import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-900',
  submitted: 'bg-blue-100 text-blue-900',
  draft: 'bg-slate-100 text-slate-800',
  active: 'bg-emerald-100 text-emerald-900',
  paid: 'bg-emerald-100 text-emerald-900',
  overdue: 'bg-red-100 text-red-900',
  cancelled: 'bg-slate-100 text-slate-700',
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[key] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
