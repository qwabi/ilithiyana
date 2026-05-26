import { z } from 'zod';
import { provinces } from '@/lib/site-config';
import { subjectIdsFieldSchema, withNormalizedSubjectIds } from '@/lib/validations/subject-ids';

const provinceEnum = z.enum(provinces);

export const enrollmentInputSchema = withNormalizedSubjectIds(z.object({
  parentFirstName: z.string().min(1, 'Parent first name is required'),
  parentLastName: z.string().min(1, 'Parent surname is required'),
  parentEmail: z.string().email('Valid email is required'),
  parentPhone: z.string().min(10, 'Valid phone number is required'),
  parentAddress: z.string().min(1, 'Home address is required'),
  province: provinceEnum,
  preferredContact: z.enum(['email', 'whatsapp']).default('email'),
  learnerFirstName: z.string().min(1, 'Learner first name is required'),
  learnerLastName: z.string().min(1, 'Learner surname is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  schoolName: z.string().min(1, 'School name is required'),
  grade: z.coerce.number().int().min(6).max(12),
  subjects: subjectIdsFieldSchema(),
  packageId: z.enum(['package-a', 'package-b']),
  schedule: z.object({
    availableDays: z.record(z.boolean()),
    timeSlots: z.record(
      z.object({
        start: z.string(),
        end: z.string(),
      })
    ),
  }),
  leadId: z.string().uuid('Invalid enrolment reference'),
  reportStoragePath: z.string().optional(),
  /** Legacy Vercel Blob URL when Supabase was unavailable */
  reportUrl: z.string().url().optional(),
  popiaConsent: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the privacy notice to apply' }),
  }),
  parentPassword: z.string().default(''),
  parentPasswordConfirm: z.string().default(''),
})).superRefine((data, ctx) => {
  const hasPassword =
    data.parentPassword.length > 0 || data.parentPasswordConfirm.length > 0;
  if (!hasPassword) return;

  if (data.parentPassword.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentPassword'],
      message: 'Password must be at least 8 characters',
    });
  }
  if (data.parentPassword !== data.parentPasswordConfirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['parentPasswordConfirm'],
      message: 'Passwords do not match',
    });
  }
});

export type EnrollmentInput = z.infer<typeof enrollmentInputSchema>;
