import { z } from 'zod';
import { subjectIdsFieldSchema, withNormalizedSubjectIds } from '@/lib/validations/subject-ids';

const manualReportRowSchema = z.object({
  subjectId: z.string().min(1),
  percentage: z.coerce.number().int().min(0).max(100),
});

export const manualReportSchema = z.object({
  term: z.string().min(1),
  academicYear: z.coerce.number().int().min(2020).max(2100),
  rows: z.array(manualReportRowSchema).min(1, 'Add at least one subject mark'),
});

export const addChildInputSchema = withNormalizedSubjectIds(
  z
    .object({
      packageId: z.enum(['package-a', 'package-b']),
      learnerFirstName: z.string().min(1, 'Learner first name is required'),
      learnerLastName: z.string().min(1, 'Learner surname is required'),
      dateOfBirth: z.string().min(1, 'Date of birth is required'),
      schoolName: z.string().min(1, 'School name is required'),
      grade: z.coerce.number().int().min(6).max(12),
      subjects: subjectIdsFieldSchema(),
      leadId: z.string().uuid(),
      manualReport: manualReportSchema.optional(),
      reportStoragePath: z.string().optional(),
      reportUrl: z.string().url().optional(),
      proofUrl: z.string().url().optional(),
    })
    .refine((data) => Boolean(data.manualReport?.rows?.length), {
      message: 'Enter school report marks for at least one subject',
      path: ['manualReport'],
    })
);

export type AddChildInput = z.infer<typeof addChildInputSchema>;

export const PORTAL_SUBJECT_ERROR =
  'Select subjects offered for this grade.';
