/** Append a step label without duplicating entries. */
export function mergeCompletedSteps(
  completed: string[],
  ...extra: string[]
): string[] {
  const out = [...completed];
  for (const step of extra) {
    if (!out.includes(step)) out.push(step);
  }
  return out;
}
