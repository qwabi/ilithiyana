import { z } from 'zod';

export const portalSubjects = [
  'Pure Maths',
  'Physical Science',
  'Life Sciences',
  'English',
] as const;

const subjectEnum = z.enum(portalSubjects);

export const addChildInputSchema = z.object({
  packageId: z.enum(['package-a', 'package-b']),
  learnerFirstName: z.string().min(1, 'Learner first name is required'),
  learnerLastName: z.string().min(1, 'Learner surname is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  schoolName: z.string().min(1, 'School name is required'),
  grade: z.coerce.number().int().min(8).max(12),
  level: z.string().min(1, 'Performance level is required'),
  subjects: z
    .array(subjectEnum)
    .min(1, 'Select at least one subject')
    .max(4, 'Maximum 4 subjects'),
  leadId: z.string().uuid(),
  reportStoragePath: z.string().min(1, 'School report is required'),
  reportUrl: z.string().url().optional(),
  proofUrl: z.string().url().optional(),
});

export type AddChildInput = z.infer<typeof addChildInputSchema>;

export const PORTAL_SUBJECT_ERROR =
  'We currently only offer Pure Maths, Physical Sciences, Life Sciences, and English.';
