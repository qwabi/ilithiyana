import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
};

type AdminEntityTableProps<T extends { id: string }> = {
  rows: T[];
  columns: Column<T>[];
  hrefForRow: (row: T) => string;
  emptyMessage?: string;
};

export function AdminEntityTable<T extends { id: string }>({
  rows,
  columns,
  hrefForRow,
  emptyMessage = 'No records found.',
}: AdminEntityTableProps<T>) {
  if (!rows.length) {
    return (
      <Card className='rounded-xl border-[0.5px] border-border bg-white shadow-sm'>
        <CardContent className='py-10 text-center text-sm text-muted-foreground'>
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='overflow-hidden rounded-xl border-[0.5px] border-border bg-white shadow-sm'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-border bg-[hsl(var(--light-blue)/0.08)] text-left'>
            {columns.map((col) => (
              <th key={col.key} className='px-4 py-3 font-semibold text-foreground'>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className='border-b border-border/60 last:border-0 hover:bg-muted/30'
            >
              {columns.map((col) => (
                <td key={col.key} className='px-4 py-3'>
                  <Link href={hrefForRow(row)} className='block hover:text-primary'>
                    {col.cell(row)}
                  </Link>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
