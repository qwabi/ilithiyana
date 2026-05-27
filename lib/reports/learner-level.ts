import { percentageToLevel } from '@/lib/reports/nsc';

export function deriveLearnerLevelFromReportRows(
  rows: { percentage: number }[]
): string {
  if (!rows.length) return 'Pending report';
  const avg =
    rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length;
  return `Level ${percentageToLevel(Math.round(avg))}`;
}
