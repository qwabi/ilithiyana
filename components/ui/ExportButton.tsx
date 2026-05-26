'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ExportColumn<T> = {
  key: keyof T | string;
  header: string;
  /** Custom cell value; defaults to String(row[key]) */
  format?: (row: T) => string;
};

export type ExportButtonProps<T extends Record<string, unknown>> = {
  data: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = col.format
          ? col.format(row)
          : String(row[col.key as keyof T] ?? '');
        return escapeCsvCell(raw);
      })
      .join(','),
  );
  return [header, ...rows].join('\n');
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename = 'export.csv',
  label = 'Export CSV',
  disabled,
  className,
  variant = 'outline',
}: ExportButtonProps<T>) {
  const handleExport = () => {
    const csv = buildCsv(data, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      type='button'
      variant={variant}
      size='sm'
      className={cn('gap-2', className)}
      disabled={disabled || data.length === 0}
      onClick={handleExport}
    >
      <Download className='h-4 w-4' aria-hidden />
      {label}
    </Button>
  );
}
