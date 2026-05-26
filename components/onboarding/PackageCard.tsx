'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function PackageCard({
  id,
  name,
  price,
  features,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  price: string;
  features: readonly string[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border-2 p-4 text-left transition-colors',
        selected
          ? 'border-primary bg-accent/40'
          : 'border-border bg-card hover:border-primary/50'
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='font-semibold text-[hsl(210,100%,25%)]'>{name}</p>
          <p className='mt-1 text-sm text-primary'>{price}</p>
        </div>
        {selected ? (
          <span className='flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <Check className='h-4 w-4' aria-hidden />
          </span>
        ) : null}
      </div>
      <ul className='mt-3 space-y-1 text-sm text-muted-foreground'>
        {features.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
    </button>
  );
}
