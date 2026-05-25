import Link from 'next/link';

type Action = {
  label: string;
  href: string;
  variant?: 'gold' | 'primary' | 'outline';
};

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: Action;
}) {
  const btnClass = {
    gold: 'bg-accent text-[hsl(210,100%,12%)] font-bold hover:bg-accent/90',
    primary:
      'bg-primary text-primary-foreground font-semibold hover:bg-primary/90',
    outline:
      'border border-primary text-primary font-semibold hover:bg-[hsl(210,100%,96%)]',
  }[action?.variant ?? 'primary'];

  return (
    <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
      <div>
        <h1 className='[font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)]'>
          {title}
        </h1>
        {description ? (
          <p className='mt-1 max-w-lg text-sm text-muted-foreground'>
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${btnClass}`}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
