import { z } from 'zod';
import {
  normalizeSubjectIds,
  validateSubjectIdsForGrade,
} from '@/lib/curriculum/learner-subjects';

/** Accept curriculum ids (and legacy tutoring names); output normalized ids. */
export function subjectIdsFieldSchema() {
  return z
    .array(z.string().min(1))
    .min(1, 'Select at least one subject')
    .max(4, 'Maximum 4 subjects');
}

export function withNormalizedSubjectIds<T extends { grade: number; subjects: string[] }>(
  schema: z.ZodType<T>
) {
  return schema
    .superRefine((data, ctx) => {
      const normalized = normalizeSubjectIds(data.subjects, data.grade);
      const err = validateSubjectIdsForGrade(normalized, data.grade);
      if (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subjects'],
          message: err,
        });
      }
    })
    .transform((data) => ({
      ...data,
      subjects: normalizeSubjectIds(data.subjects, data.grade),
    }));
}
