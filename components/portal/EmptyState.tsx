import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-[#F8FAFC] px-6 py-12 text-center'>
      {Icon ? <Icon className='mb-3 h-10 w-10 text-[#1B6CA8]/60' /> : null}
      <p className='text-base font-medium text-[#0F2942]'>{title}</p>
      {description ? (
        <p className='mt-1 max-w-sm text-sm text-muted-foreground'>{description}</p>
      ) : null}
      {action ? <div className='mt-4'>{action}</div> : null}
    </div>
  );
}
