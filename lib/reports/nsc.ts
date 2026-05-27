/** NSC level ↔ percentage ↔ class band (Ilithiyana Academics). */

export type ClassBand = 'A' | 'B' | 'C' | 'D';

export const BAND_GOALS: Record<ClassBand, string> = {
  A: 'We focus on building the foundation and getting your child to a solid pass.',
  B: 'We focus on closing gaps and pushing your child to adequate and moderate achievement.',
  C: 'We focus on consolidating understanding and pushing toward merit-level performance.',
  D: 'We focus on maintaining excellence and preparing for top university entry requirements.',
};

export function percentageToLevel(percentage: number): number {
  const p = Math.round(percentage);
  if (p >= 80) return 7;
  if (p >= 70) return 6;
  if (p >= 60) return 5;
  if (p >= 50) return 4;
  if (p >= 40) return 3;
  if (p >= 30) return 2;
  return 1;
}

export function levelToBand(level: number): ClassBand {
  if (level <= 1) return 'A';
  if (level <= 3) return 'B';
  if (level <= 5) return 'C';
  return 'D';
}

export function percentageToBand(percentage: number): ClassBand {
  return levelToBand(percentageToLevel(percentage));
}

export function buildClassLabel(grade: number, band: ClassBand, subjectCode: string): string {
  return `${grade}${band}-${subjectCode}`;
}

export function bandIndex(band: ClassBand): number {
  return { A: 0, B: 1, C: 2, D: 3 }[band];
}

export function bandChangeSeverity(
  previousBand: ClassBand,
  newBand: ClassBand
): 'watch' | 'urgent' | 'positive' | null {
  const prev = bandIndex(previousBand);
  const next = bandIndex(newBand);
  if (next === prev) return null;
  if (next > prev) return 'positive';
  const drop = prev - next;
  if (drop >= 2) return 'urgent';
  if (drop === 1) return 'watch';
  return null;
}
