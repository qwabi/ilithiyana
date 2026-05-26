import {
  getOfferedSubjectsForGrade,
  getSubjectById,
  subjectDisplayName,
  type SubjectEntry,
} from '@/lib/curriculum/subjects';
import type { Subject } from '@/lib/site-config';
import { subjects as tutoringSubjectLabels } from '@/lib/site-config';

/** `learners.subjects` and `applications.subjects` store curriculum subject ids. */
export type LearnerSubjectId = string;

const LEGACY_TUTORING_NAMES = new Set<string>(tutoringSubjectLabels);

function isLikelySubjectId(ref: string): boolean {
  return Boolean(getSubjectById(ref));
}

/**
 * Resolve a stored value or legacy tutoring label to a curriculum subject id for a grade.
 */
export function resolveSubjectRef(
  ref: string,
  grade: number
): LearnerSubjectId | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;

  const byId = getSubjectById(trimmed);
  if (byId?.is_offered && byId.grades.includes(grade)) {
    return trimmed;
  }

  const offered = getOfferedSubjectsForGrade(grade);

  if (LEGACY_TUTORING_NAMES.has(trimmed as Subject)) {
    const matches = offered.filter((s) => s.tutoringSubject === trimmed);
    if (matches.length === 1) return matches[0].id;
    if (matches.length > 1) {
      const fet = matches.find((s) => s.phase === 'fet');
      const junior = matches.find((s) => s.phase === 'junior');
      if (grade >= 10) return fet?.id ?? matches[0].id;
      return junior?.id ?? matches[0].id;
    }
  }

  const byName = offered.find(
    (s) => s.name === trimmed || subjectDisplayName(s) === trimmed
  );
  return byName?.id ?? null;
}

/** Normalize mixed legacy names / ids to canonical subject ids for a grade. */
export function normalizeSubjectIds(
  refs: string[],
  grade: number
): LearnerSubjectId[] {
  const ids: LearnerSubjectId[] = [];
  for (const ref of refs) {
    const id = resolveSubjectRef(ref, grade);
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

export function validateSubjectIdsForGrade(
  ids: string[],
  grade: number
): string | null {
  if (!ids.length) return 'Select at least one subject';
  if (ids.length > 4) return 'Maximum 4 subjects';
  for (const id of ids) {
    const sub = getSubjectById(id);
    if (!sub?.is_offered) {
      return `Unknown or unavailable subject: ${id}`;
    }
    if (!sub.grades.includes(grade)) {
      return `${subjectDisplayName(sub)} is not offered for Grade ${grade}`;
    }
  }
  return null;
}

/** Read path: coerce stored values to ids (handles legacy rows). */
export function resolveLearnerSubjectIds(
  stored: string[] | null | undefined,
  grade: number
): LearnerSubjectId[] {
  if (!stored?.length) return [];
  if (stored.every(isLikelySubjectId)) {
    return stored.filter((id) => {
      const sub = getSubjectById(id);
      return sub?.is_offered && sub.grades.includes(grade);
    });
  }
  return normalizeSubjectIds(stored, grade);
}

export function formatSubjectLabel(
  subjectId: string,
  grade?: number
): string {
  const sub = getSubjectById(subjectId);
  if (sub) return subjectDisplayName(sub);
  if (grade != null) {
    const resolved = resolveSubjectRef(subjectId, grade);
    if (resolved) {
      const r = getSubjectById(resolved);
      if (r) return subjectDisplayName(r);
    }
  }
  return subjectId;
}

export function formatSubjectLabels(
  subjectIds: string[],
  grade?: number
): string[] {
  return subjectIds.map((id) => formatSubjectLabel(id, grade));
}

/** Class catalog rows use tutoring package names — map stored ids for enrollment. */
export function subjectIdsToTutoringNames(
  subjectIds: string[]
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const id of subjectIds) {
    const sub = getSubjectById(id);
    const tutoring = sub?.tutoringSubject;
    if (tutoring && !seen.has(tutoring)) {
      seen.add(tutoring);
      names.push(tutoring);
    }
  }
  return names;
}

export type TutoringPlacement = { subject: string; band: import('@/lib/reports/nsc').ClassBand };

/** Build class-group placements (tutoring name + band) from subject ids. */
export function buildTutoringPlacementsFromSubjectIds(
  subjectIds: string[],
  bandBySubjectId: Map<string, import('@/lib/reports/nsc').ClassBand>,
  defaultBand: import('@/lib/reports/nsc').ClassBand
): TutoringPlacement[] {
  const byTutoring = new Map<string, import('@/lib/reports/nsc').ClassBand>();
  for (const id of subjectIds) {
    const sub = getSubjectById(id);
    const tutoring = sub?.tutoringSubject;
    if (!tutoring) continue;
    const band = bandBySubjectId.get(id) ?? defaultBand;
    if (!byTutoring.has(tutoring)) {
      byTutoring.set(tutoring, band);
    }
  }
  return Array.from(byTutoring.entries()).map(([subject, band]) => ({
    subject,
    band,
  }));
}

export function offeredSubjectEntry(id: string): SubjectEntry | undefined {
  return getSubjectById(id);
}
