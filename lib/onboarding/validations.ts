import { z } from 'zod';
import { provinces, packages } from '@/lib/site-config';
import { subjectIdsFieldSchema, withNormalizedSubjectIds } from '@/lib/validations/subject-ids';

const provinceEnum = z.enum(provinces);
const packageIds = packages.map((p) => p.id) as [string, ...string[]];

export const onboardingStartSchema = z
  .object({
    parentFirstName: z.string().min(1),
    parentLastName: z.string().min(1),
    parentEmail: z.string().email(),
    parentPhone: z.string().min(10),
    parentAddress: z.string().min(1),
    province: provinceEnum,
    password: z.string().optional(),
    parentPassword: z.string().optional(),
    popiaConsent: z.literal(true),
    sessionId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const pwd = (data.password ?? data.parentPassword ?? '').trim();
    if (pwd.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password must be at least 8 characters',
      });
    }
  })
  .transform((data) => ({
    ...data,
    password: (data.password ?? data.parentPassword ?? '').trim(),
    preferredContact: 'email' as const,
  }));

export const onboardingSaveChildrenSchema = z.object({
  sessionId: z.string().uuid(),
  childCount: z.coerce.number().int().min(1).max(6),
  packageSelections: z
    .array(
      z.object({
        learner_slot: z.coerce.number().int().min(1).max(6),
        package_id: z.enum(['package-a', 'package-b']),
        package_name: z.string().min(1),
        price_cents: z.coerce.number().int().positive(),
      })
    )
    .min(1)
    .max(6),
});

export const onboardingSaveChildSchema = withNormalizedSubjectIds(
  z.object({
    sessionId: z.string().uuid(),
    learnerSlot: z.coerce.number().int().min(1).max(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    schoolName: z.string().min(1),
    grade: z.coerce.number().int().min(6).max(12),
    level: z.string().optional(),
    subjects: subjectIdsFieldSchema(),
    schedule: z.record(z.unknown()).default({}),
  })
);

export const sessionIdBodySchema = z.object({
  sessionId: z.string().uuid(),
  payfastPaymentId: z.string().optional(),
});

export const onboardingCompleteSchema = z.object({
  sessionId: z.string().uuid(),
  reportsAdded: z.boolean().optional(),
});
