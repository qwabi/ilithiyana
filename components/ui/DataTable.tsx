'use client';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  /** Highlight row on click */
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyTitle = 'No records',
  emptyDescription = 'Nothing to show yet.',
  className,
  onRowClick,
  isLoading,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-border bg-white p-8', className)}>
        <p className='text-center text-sm text-muted-foreground'>Loading…</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        className={className}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-white',
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className='bg-[#F8FAFC] hover:bg-[#F8FAFC]'>
            {columns.map((col) => (
              <TableHead key={col.id} className={col.headerClassName}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={getRowKey(row)}
              className={cn(onRowClick && 'cursor-pointer')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
