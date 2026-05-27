/** Lead magnet routes and slugs — keep in sync with app/resources pages. */

export const SUBJECT_CHOICE_MAGNET = {
  slug: 'subject-choice',
  source: 'subject-checklist',
  path: '/resources/subject-choice',
  thankYouPath: '/resources/subject-choice/thank-you',
  checklistPath: '/resources/subject-choice/checklist',
  title: 'CAPS Subject Choice Checklist',
  shortTitle: 'Subject choice checklist',
} as const;

export function leadMagnetChecklistUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}${SUBJECT_CHOICE_MAGNET.checklistPath}`;
}
