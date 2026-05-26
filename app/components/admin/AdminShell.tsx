import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

type AdminShellProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminShell({
  title,
  description,
  backHref,
  backLabel = 'Back',
  actions,
  children,
}: AdminShellProps) {
  return (
    <div>
      {backHref ? (
        <Link
          href={backHref}
          className='mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground'
        >
          <ChevronLeft className='h-4 w-4' />
          {backLabel}
        </Link>
      ) : null}
      <div className='mb-8 flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className={pageTitle}>{title}</h1>
          {description ? (
            <p className='mt-2 max-w-2xl text-muted-foreground'>{description}</p>
          ) : null}
        </div>
        {actions ? <div className={cn('flex shrink-0 gap-2')}>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export { pageTitle as adminPageTitle };
