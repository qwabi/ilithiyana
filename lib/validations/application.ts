import { z } from 'zod';
import {
  grades,
  packages,
  provinces,
  subjects,
} from '@/lib/site-config';
import type {
  ApplicationSchedule,
  LearnerSnapshot,
  ParentSnapshot,
  SubmitApplicationRpcArgs,
} from '@/lib/types/database';

const provinceEnum = z.enum(provinces);
const subjectEnum = z.enum(subjects);
const packageIdEnum = z.enum([
  packages[0].id,
  packages[1].id,
] as [string, string]);

const gradeValues = grades as readonly number[];
const gradeSchema = z.coerce
  .number()
  .int()
  .refine((g) => gradeValues.includes(g), 'Select a grade from 6 to 12');

const scheduleDaySchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const applicationScheduleSchema = z.object({
  availableDays: z
    .record(z.boolean())
    .default({})
    .refine(
      (days) => Object.values(days).some(Boolean),
      'Select at least one available day'
    ),
  timeSlots: z.record(scheduleDaySchema).default({}),
});

export const parentSnapshotSchema = z.object({
  firstName: z.string().trim().min(1, 'Parent first name is required'),
  lastName: z.string().trim().min(1, 'Parent last name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(10, 'Enter a valid cell number')
    .max(20, 'Phone number is too long'),
  address: z.string().trim().optional(),
});

export const learnerSnapshotSchema = z.object({
  firstName: z.string().trim().min(1, 'Learner first name is required'),
  lastName: z.string().trim().min(1, 'Learner last name is required'),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD'),
  schoolName: z.string().trim().min(1, 'School name is required'),
  grade: gradeSchema,
  level: z.string().trim().optional(),
});

export const applicationFormSchema = z.object({
  parent: parentSnapshotSchema,
  learner: learnerSnapshotSchema,
  province: provinceEnum,
  subjects: z
    .array(subjectEnum)
    .min(1, 'Select at least one subject'),
  packageId: packageIdEnum,
  schedule: applicationScheduleSchema,
  reportUrl: z.string().url('Upload your latest school report').optional(),
  paymentProofUrl: z
    .string()
    .url('Upload proof of payment')
    .optional(),
});

export type ApplicationFormInput = z.input<typeof applicationFormSchema>;
export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(20).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message is too long'),
});

export type ContactMessageFormValues = z.infer<typeof contactMessageSchema>;

/** Map validated form values to `submit_application` RPC args. */
export function toSubmitApplicationRpcArgs(
  values: ApplicationFormValues
): SubmitApplicationRpcArgs {
  return {
    p_parent: values.parent as ParentSnapshot,
    p_learner: values.learner as LearnerSnapshot,
    p_province: values.province,
    p_subjects: values.subjects,
    p_package_id: values.packageId,
    p_schedule: values.schedule as ApplicationSchedule,
    p_report_url: values.reportUrl ?? null,
    p_payment_proof_url: values.paymentProofUrl ?? null,
  };
}

/** Legacy AcademicsForm field names → canonical application form shape. */
export function legacyAcademicsFormToApplicationInput(raw: {
  parentName?: string;
  parentSurname?: string;
  address?: string;
  cellNumber?: string;
  email?: string;
  learnerName?: string;
  learnerSurname?: string;
  dateOfBirth?: string;
  schoolName?: string;
  grade?: string | number;
  subjects?: string[];
  package?: string;
  province?: string;
  availableDays?: Record<string, boolean>;
  timeSlots?: Record<string, { start: string; end: string }>;
  reportUrl?: string;
  paymentProofUrl?: string;
}): ApplicationFormInput {
  const subjectMap: Record<string, (typeof subjects)[number]> = {
    Mathematics: 'Pure Maths',
    'Physical Sciences': 'Physical Science',
    English: 'English',
    'Life Sciences': 'Life Sciences',
    'Natural Sciences': 'Natural Sciences',
  };

  const mappedSubjects = (raw.subjects ?? [])
    .map((s) => subjectMap[s] ?? s)
    .filter((s): s is (typeof subjects)[number] =>
      (subjects as readonly string[]).includes(s)
    );

  let packageId = raw.package ?? packages[0].id;
  if (packageId === 'Package A') packageId = 'package-a';
  if (packageId === 'Package B') packageId = 'package-b';

  return {
    parent: {
      firstName: raw.parentName ?? '',
      lastName: raw.parentSurname ?? '',
      email: raw.email ?? '',
      phone: raw.cellNumber ?? '',
      address: raw.address,
    },
    learner: {
      firstName: raw.learnerName ?? '',
      lastName: raw.learnerSurname ?? '',
      dateOfBirth: raw.dateOfBirth ?? '',
      schoolName: raw.schoolName ?? '',
      grade: raw.grade != null && raw.grade !== '' ? Number(raw.grade) : 0,
      level: undefined,
    },
    province: (raw.province ?? provinces[0]) as (typeof provinces)[number],
    subjects: mappedSubjects,
    packageId: packageId as ApplicationFormInput['packageId'],
    schedule: {
      availableDays: raw.availableDays ?? {},
      timeSlots: raw.timeSlots ?? {},
    },
    reportUrl: raw.reportUrl,
    paymentProofUrl: raw.paymentProofUrl,
  };
}
