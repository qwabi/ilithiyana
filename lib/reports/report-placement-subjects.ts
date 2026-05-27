import { resolveSubjectRef } from '@/lib/curriculum/learner-subjects';
import {
  getSubjectById,
  toTutoringSubjectName,
  TUTORING_SUBJECTS,
} from '@/lib/curriculum/subjects';

/** Map display / legacy class.subject values to canonical tutoring names. */
const TUTORING_SUBJECT_ALIASES: Record<string, string> = {
  'Pure Mathematics': 'Pure Maths',
  Mathematics: 'Pure Maths',
  'Physical Sciences': 'Physical Science',
  'Life Science': 'Life Sciences',
};

export function canonicalTutoringSubjectName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (TUTORING_SUBJECT_ALIASES[trimmed]) {
    return TUTORING_SUBJECT_ALIASES[trimmed];
  }
  if ((TUTORING_SUBJECTS as readonly string[]).includes(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

export function tutoringSubjectsMatch(a: string, b: string): boolean {
  return (
    canonicalTutoringSubjectName(a) === canonicalTutoringSubjectName(b)
  );
}

export function tutoringSubjectInSet(
  classSubject: string,
  reportSubjects: Set<string>
): boolean {
  const canon = canonicalTutoringSubjectName(classSubject);
  for (const s of reportSubjects) {
    if (canonicalTutoringSubjectName(s) === canon) return true;
  }
  return false;
}

/** Subjects placed from report marks (extractions + saved levels). */
export function tutoringSubjectsFromReportRows(
  extractions: { subject_name_clean: string | null; is_offered: boolean }[],
  levelSubjects: { subject: string }[],
  grade: number
): Set<string> {
  const names = new Set<string>();

  for (const row of extractions) {
    if (!row.is_offered) continue;
    const clean = row.subject_name_clean?.trim();
    if (!clean) continue;
    const subjectId = resolveSubjectRef(clean, grade);
    if (!subjectId) continue;
    const subject = getSubjectById(subjectId);
    const tutoring = subject ? toTutoringSubjectName(subject) : null;
    if (tutoring) names.add(canonicalTutoringSubjectName(tutoring));
  }

  for (const lvl of levelSubjects) {
    const clean = lvl.subject?.trim();
    if (!clean) continue;
    const subjectId = resolveSubjectRef(clean, grade);
    if (!subjectId) continue;
    const subject = getSubjectById(subjectId);
    const tutoring = subject ? toTutoringSubjectName(subject) : null;
    if (tutoring) names.add(canonicalTutoringSubjectName(tutoring));
  }

  return names;
}
