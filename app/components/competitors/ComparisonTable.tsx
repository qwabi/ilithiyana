import type { ComparisonRow } from '@/lib/competitors';
import { brand } from '@/lib/site-config';

type ComparisonTableProps = {
  rows: ComparisonRow[];
  competitorName: string;
};

export function ComparisonTable({ rows, competitorName }: ComparisonTableProps) {
  return (
    <div className='overflow-x-auto rounded-xl border border-[hsl(214,32%,91%)]'>
      <table className='w-full min-w-[520px] border-collapse text-left text-sm'>
        <thead>
          <tr className='border-b border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)]'>
            <th scope='col' className='px-4 py-3 font-semibold text-foreground'>
              &nbsp;
            </th>
            <th scope='col' className='px-4 py-3 font-semibold text-primary'>
              {brand.name}
            </th>
            <th scope='col' className='px-4 py-3 font-semibold text-foreground'>
              {competitorName}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className='border-b border-[hsl(214,32%,91%)] last:border-0'
            >
              <th
                scope='row'
                className='px-4 py-3 font-medium text-muted-foreground'
              >
                {row.label}
              </th>
              <td className='px-4 py-3 text-foreground'>{row.ilithiyana}</td>
              <td className='px-4 py-3 text-muted-foreground'>
                {row.competitor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
