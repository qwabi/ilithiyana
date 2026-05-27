'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type FilterBarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Slot for selects, date pickers, etc. */
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
  className?: string;
};

export function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  actions,
  onClear,
  showClear,
  className,
}: FilterBarProps) {
  const canClear = showClear ?? Boolean(searchValue);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {onSearchChange ? (
        <div className='relative min-w-[200px] flex-1 sm:max-w-xs'>
          <Search
            className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
            aria-hidden
          />
          <Input
            type='search'
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className='pl-9'
          />
        </div>
      ) : null}

      {filters ? (
        <div className='flex flex-wrap items-center gap-2'>{filters}</div>
      ) : null}

      <div className='flex flex-wrap items-center gap-2 sm:ml-auto'>
        {canClear && onClear ? (
          <Button type='button' variant='ghost' size='sm' onClick={onClear}>
            <X className='mr-1 h-4 w-4' />
            Clear
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
