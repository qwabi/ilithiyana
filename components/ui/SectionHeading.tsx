import { cn } from '@/lib/utils';

export type SectionHeadingProps = {
  title: string;
  description?: string;
  /** Right-aligned actions (buttons, links) */
  actions?: React.ReactNode;
  className?: string;
  /** Smaller variant for nested sections */
  size?: 'default' | 'sm';
};

export function SectionHeading({
  title,
  description,
  actions,
  className,
  size = 'default',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className='space-y-1'>
        <h2
          className={cn(
            'font-display text-[#0F2942]',
            size === 'default' ? 'text-2xl md:text-3xl' : 'text-xl',
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className='max-w-2xl text-sm text-muted-foreground'>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>
      ) : null}
    </div>
  );
}
