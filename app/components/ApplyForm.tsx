'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import {
  loadEnrollmentLeadForResume,
  startEnrollmentWithPayment,
} from '../actions/application-actions';
import { PayFastRedirectForm } from './PayFastRedirectForm';
import {
  getOfferedSubjectsForGrade,
  subjectDisplayName,
} from '@/lib/curriculum/subjects';
import {
  brand,
  grades,
  packages,
  provinces,
  sessionInfo,
  contact,
} from '@/lib/site-config';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
});

const SCHEDULE_DAYS = [
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

const subjectChipStyles: Record<string, string> = {
  'Pure Maths': 'bg-blue-50 border-blue-200 text-blue-900',
  'Physical Science': 'bg-teal-50 border-teal-200 text-teal-900',
  'Life Sciences': 'bg-sky-50 border-sky-200 text-sky-900',
  English: 'bg-blue-50/90 border-blue-100 text-blue-800',
  'Natural Sciences': 'bg-teal-50/90 border-teal-100 text-teal-800',
};

const emptySchedule = () => ({
  availableDays: Object.fromEntries(
    SCHEDULE_DAYS.map((d) => [d, false])
  ) as Record<ScheduleDay, boolean>,
  timeSlots: Object.fromEntries(
    SCHEDULE_DAYS.map((d) => [d, { start: '', end: '' }])
  ) as Record<ScheduleDay, { start: string; end: string }>,
});

const initialForm = {
  parentFirstName: '',
  parentLastName: '',
  parentAddress: '',
  parentPhone: '',
  parentEmail: '',
  parentPassword: '',
  parentPasswordConfirm: '',
  preferredContact: 'email' as 'email' | 'whatsapp',
  province: '',
  learnerFirstName: '',
  learnerLastName: '',
  dateOfBirth: '',
  schoolName: '',
  grade: '',
  subjects: [] as string[],
  packageId: '',
  schedule: emptySchedule(),
  popiaConsent: false,
};

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className='border-b border-[hsl(214,32%,91%)] px-6 py-8 last:border-b-0'>
      <h2
        className={`${dmSerif.className} mb-6 text-[20px] text-[hsl(210,100%,25%)]`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function scheduleFromResume(raw: Record<string, unknown>) {
  const base = emptySchedule();
  const available = raw.availableDays as Record<string, boolean> | undefined;
  const slots = raw.timeSlots as
    | Record<string, { start?: string; end?: string }>
    | undefined;
  if (available) {
    for (const day of SCHEDULE_DAYS) {
      if (typeof available[day] === 'boolean') {
        base.availableDays[day] = available[day];
      }
    }
  }
  if (slots) {
    for (const day of SCHEDULE_DAYS) {
      const slot = slots[day];
      if (slot) {
        base.timeSlots[day] = {
          start: slot.start ?? '',
          end: slot.end ?? '',
        };
      }
    }
  }
  return base;
}

export default function ApplyForm({
  resumeLeadId,
}: {
  resumeLeadId?: string;
}) {
  const [formData, setFormData] = useState(initialForm);
  const [resumeLeadIdState, setResumeLeadIdState] = useState<string | undefined>(
    resumeLeadId
  );
  const [resumeLoading, setResumeLoading] = useState(Boolean(resumeLeadId));
  const [submitting, setSubmitting] = useState(false);
  const [payfastRedirect, setPayfastRedirect] = useState<{
    processUrl: string;
    fields: Record<string, string>;
  } | null>(null);
  useEffect(() => {
    if (!resumeLeadId) return;

    let cancelled = false;
    (async () => {
      setResumeLoading(true);
      const result = await loadEnrollmentLeadForResume(resumeLeadId);
      if (cancelled) return;
      setResumeLoading(false);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const d = result.data;
      setResumeLeadIdState(d.leadId);
      setFormData({
        parentFirstName: d.parentFirstName,
        parentLastName: d.parentLastName,
        parentAddress: d.parentAddress,
        parentPhone: d.parentPhone,
        parentEmail: d.parentEmail,
        parentPassword: '',
        parentPasswordConfirm: '',
        preferredContact: d.preferredContact,
        province: d.province,
        learnerFirstName: d.learnerFirstName,
        learnerLastName: d.learnerLastName,
        dateOfBirth: d.dateOfBirth,
        schoolName: d.schoolName,
        grade: String(d.grade),
        subjects: d.subjects,
        packageId: d.packageId,
        schedule: scheduleFromResume(d.schedule),
        popiaConsent: true,
      });
      toast.success('Application loaded — confirm your details and pay again.');
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeLeadId]);

  const gradeNum = parseInt(formData.grade, 10);
  const offeredSubjects = useMemo(
    () =>
      gradeNum
        ? getOfferedSubjectsForGrade(gradeNum).filter((s) => s.is_offered)
        : [],
    [gradeNum]
  );

  const toggleSubject = (subjectId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      subjects: checked
        ? prev.subjects.length >= 4
          ? prev.subjects
          : [...prev.subjects, subjectId]
        : prev.subjects.filter((s) => s !== subjectId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.popiaConsent) {
      toast.error('Please accept the privacy notice to continue.');
      return;
    }

    const isResumeSubmit = Boolean(resumeLeadIdState);

    if (!isResumeSubmit) {
      if (formData.parentPassword.length < 8) {
        toast.error('Password must be at least 8 characters.');
        return;
      }

      if (formData.parentPassword !== formData.parentPasswordConfirm) {
        toast.error('Passwords do not match.');
        return;
      }
    } else if (
      formData.parentPassword.length > 0 &&
      formData.parentPassword !== formData.parentPasswordConfirm
    ) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const leadId = resumeLeadIdState ?? crypto.randomUUID();

      const result = await startEnrollmentWithPayment({
        ...formData,
        grade: Number(formData.grade),
        leadId,
        parentPassword: formData.parentPassword,
        parentPasswordConfirm: formData.parentPasswordConfirm,
        popiaConsent: true as const,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      try {
        sessionStorage.setItem(
          'ilithiyana_enrollment_auth',
          JSON.stringify({
            email: formData.parentEmail.trim().toLowerCase(),
            password: formData.parentPassword,
            leadId: result.leadId,
          })
        );
      } catch {
        /* private mode / storage blocked */
      }

      setPayfastRedirect({
        processUrl: result.processUrl,
        fields: result.fields,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not submit application';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (payfastRedirect) {
    return (
      <div
        className={`mx-auto max-w-2xl rounded-xl border border-[0.5px] border-[hsl(214,32%,91%)] bg-white p-8 text-center ${jakarta.className}`}
      >
        <Loader2 className='mx-auto h-10 w-10 animate-spin text-primary' />
        <h2
          className={`${dmSerif.className} mt-4 text-2xl text-[hsl(210,100%,25%)]`}
        >
          Redirecting to secure payment
        </h2>
        <p className='mx-auto mt-3 max-w-md text-muted-foreground'>
          Please wait while we take you to PayFast to complete your enrolment
          payment. Do not close this window.
        </p>
        <PayFastRedirectForm
          action={payfastRedirect.processUrl}
          fields={payfastRedirect.fields}
        />
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-3xl ${jakarta.className}`}>
      {resumeLoading && (
        <p className='mb-4 flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
          Loading your saved application…
        </p>
      )}
      {resumeLeadIdState && !resumeLoading && (
        <p className='mb-4 rounded-lg bg-primary-light px-4 py-3 text-sm text-[hsl(210,100%,25%)]'>
          Your application is saved. Review your details below, then continue to
          PayFast to complete payment.
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className='overflow-hidden rounded-xl border border-[0.5px] border-[hsl(214,32%,91%)] bg-white shadow-none'
      >
        <FormSection title='Parent or guardian'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Label htmlFor='parentFirstName'>First name(s)</Label>
              <Input
                id='parentFirstName'
                value={formData.parentFirstName}
                onChange={(e) =>
                  setFormData({ ...formData, parentFirstName: e.target.value })
                }
                required
                className='mt-1'
              />
            </div>
            <div>
              <Label htmlFor='parentLastName'>Surname</Label>
              <Input
                id='parentLastName'
                value={formData.parentLastName}
                onChange={(e) =>
                  setFormData({ ...formData, parentLastName: e.target.value })
                }
                required
                className='mt-1'
              />
            </div>
          </div>
          <div className='mt-4'>
            <Label htmlFor='parentAddress'>Home address</Label>
            <Input
              id='parentAddress'
              value={formData.parentAddress}
              onChange={(e) =>
                setFormData({ ...formData, parentAddress: e.target.value })
              }
              required
              className='mt-1'
            />
          </div>
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <div>
              <Label htmlFor='province'>Province</Label>
              <Select
                value={formData.province || undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, province: value })
                }
              >
                <SelectTrigger id='province' className='mt-1'>
                  <SelectValue placeholder='Select province' />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor='parentPhone'>Cell number</Label>
              <Input
                id='parentPhone'
                type='tel'
                value={formData.parentPhone}
                onChange={(e) =>
                  setFormData({ ...formData, parentPhone: e.target.value })
                }
                required
                className='mt-1'
              />
            </div>
          </div>
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <div>
              <Label htmlFor='parentPassword'>Create a password</Label>
              <Input
                id='parentPassword'
                type='password'
                autoComplete='new-password'
                value={formData.parentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, parentPassword: e.target.value })
                }
                required
                minLength={8}
                className='mt-1'
              />
              <p className='mt-1 text-xs text-muted-foreground'>
                At least 8 characters — used to sign in to your parent dashboard.
              </p>
            </div>
            <div>
              <Label htmlFor='parentPasswordConfirm'>Confirm password</Label>
              <Input
                id='parentPasswordConfirm'
                type='password'
                autoComplete='new-password'
                value={formData.parentPasswordConfirm}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    parentPasswordConfirm: e.target.value,
                  })
                }
                required
                minLength={8}
                className='mt-1'
              />
            </div>
          </div>
          <div className='mt-4'>
            <Label htmlFor='parentEmail'>Email address</Label>
            <Input
              id='parentEmail'
              type='email'
              value={formData.parentEmail}
              onChange={(e) =>
                setFormData({ ...formData, parentEmail: e.target.value })
              }
              required
              className='mt-1'
            />
          </div>
          <div className='mt-4'>
            <Label>Preferred contact method</Label>
            <div className='mt-2 flex gap-4'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='radio'
                  name='preferredContact'
                  checked={formData.preferredContact === 'email'}
                  onChange={() =>
                    setFormData({ ...formData, preferredContact: 'email' })
                  }
                />
                Email
              </label>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='radio'
                  name='preferredContact'
                  checked={formData.preferredContact === 'whatsapp'}
                  onChange={() =>
                    setFormData({ ...formData, preferredContact: 'whatsapp' })
                  }
                />
                WhatsApp
              </label>
            </div>
          </div>
        </FormSection>

        <FormSection title='Learner'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Label htmlFor='learnerFirstName'>First name(s)</Label>
              <Input
                id='learnerFirstName'
                value={formData.learnerFirstName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    learnerFirstName: e.target.value,
                  })
                }
                required
                className='mt-1'
              />
            </div>
            <div>
              <Label htmlFor='learnerLastName'>Surname</Label>
              <Input
                id='learnerLastName'
                value={formData.learnerLastName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    learnerLastName: e.target.value,
                  })
                }
                required
                className='mt-1'
              />
            </div>
          </div>
          <div className='mt-4 grid gap-4 md:grid-cols-2'>
            <div>
              <Label htmlFor='dateOfBirth'>Date of birth</Label>
              <Input
                id='dateOfBirth'
                type='date'
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                required
                className='mt-1'
              />
            </div>
            <div>
              <Label htmlFor='schoolName'>School name</Label>
              <Input
                id='schoolName'
                value={formData.schoolName}
                onChange={(e) =>
                  setFormData({ ...formData, schoolName: e.target.value })
                }
                required
                className='mt-1'
              />
            </div>
          </div>
          <div className='mt-4'>
            <Label htmlFor='grade'>Current grade</Label>
            <Select
              value={formData.grade}
              onValueChange={(value) =>
                setFormData({ ...formData, grade: value, subjects: [] })
              }
              required
            >
              <SelectTrigger id='grade' className='mt-1'>
                <SelectValue placeholder='Select grade' />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={String(grade)}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormSection>

        <FormSection title='Subjects and package'>
          <div className='space-y-3'>
            <Label>Subjects for tutoring</Label>
            <div className='flex flex-wrap gap-2'>
              {offeredSubjects.length > 0 ? (
                offeredSubjects.map((sub) => {
                  const selected = formData.subjects.includes(sub.id);
                  const chipKey = sub.tutoringSubject ?? sub.id;
                  const chipClass =
                    subjectChipStyles[chipKey] ??
                    'bg-[hsl(210,55%,96%)] border-[hsl(214,32%,91%)]';
                  return (
                    <label
                      key={sub.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-opacity ${chipClass} ${selected ? 'ring-2 ring-primary ring-offset-1' : 'opacity-70'}`}
                    >
                      <Checkbox
                        id={sub.id}
                        checked={selected}
                        onCheckedChange={(checked) =>
                          toggleSubject(sub.id, checked === true)
                        }
                        className='sr-only'
                      />
                      {subjectDisplayName(sub)}
                    </label>
                  );
                })
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Select a grade to see subjects we tutor.
                </p>
              )}
            </div>
          </div>
          <div className='mt-6'>
            <Label>Package</Label>
            <Select
              value={formData.packageId}
              onValueChange={(value) =>
                setFormData({ ...formData, packageId: value })
              }
              required
            >
              <SelectTrigger className='mt-1'>
                <SelectValue placeholder='Select package' />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — {pkg.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='mt-2 text-sm text-muted-foreground'>{sessionInfo}</p>
          </div>
        </FormSection>

        <FormSection title='Preferred days and times'>
          <p className='mb-4 text-sm text-muted-foreground'>
            Select days your learner is available. Final times are agreed with
            your tutor.
          </p>
          <div className='space-y-4'>
            {SCHEDULE_DAYS.map((day) => (
              <div key={day} className='flex flex-wrap items-center gap-4'>
                <Checkbox
                  id={day}
                  checked={formData.schedule.availableDays[day]}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      schedule: {
                        ...formData.schedule,
                        availableDays: {
                          ...formData.schedule.availableDays,
                          [day]: checked === true,
                        },
                      },
                    });
                  }}
                />
                <Label htmlFor={day} className='w-24 capitalize'>
                  {day}
                </Label>
                {formData.schedule.availableDays[day] && (
                  <div className='flex items-center gap-2'>
                    <Input
                      type='time'
                      aria-label={`${day} start`}
                      value={formData.schedule.timeSlots[day].start}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          schedule: {
                            ...formData.schedule,
                            timeSlots: {
                              ...formData.schedule.timeSlots,
                              [day]: {
                                ...formData.schedule.timeSlots[day],
                                start: e.target.value,
                              },
                            },
                          },
                        })
                      }
                    />
                    <span className='text-sm text-muted-foreground'>to</span>
                    <Input
                      type='time'
                      aria-label={`${day} end`}
                      value={formData.schedule.timeSlots[day].end}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          schedule: {
                            ...formData.schedule,
                            timeSlots: {
                              ...formData.schedule.timeSlots,
                              [day]: {
                                ...formData.schedule.timeSlots[day],
                                end: e.target.value,
                              },
                            },
                          },
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title='School report'>
          <p className='text-sm text-muted-foreground'>
            After payment you can enter your child&apos;s latest marks from your
            dashboard using the report builder — no file upload needed.
          </p>
          <p className='mt-4 text-sm text-muted-foreground'>
            Payment is completed securely via PayFast after you submit this form.
            No manual EFT proof is required.
          </p>
        </FormSection>

        <div className='px-6 py-8'>
          <div className='flex items-start gap-3'>
            <Checkbox
              id='popiaConsent'
              checked={formData.popiaConsent}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  popiaConsent: checked === true,
                })
              }
              required
            />
            <Label htmlFor='popiaConsent' className='text-sm leading-relaxed'>
              I consent to Ilithiyana Academics collecting and processing the
              personal information in this form to review my application,
              communicate about tutoring, and meet legal obligations under
              POPIA.
            </Label>
          </div>

          <Button
            type='submit'
            size='lg'
            disabled={submitting}
            className='mt-6 w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90'
          >
            {submitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Saving &amp; redirecting…
              </>
            ) : (
              'Proceed to secure payment'
            )}
          </Button>

          <p className='mt-4 text-[11px] leading-relaxed text-muted-foreground'>
            We collect parent and learner details, contact information, and school
            reports to process your enrolment, arrange tutoring, and meet legal
            obligations. Payment is handled by PayFast. Data is stored securely;
            we do not sell personal information. You may request access or
            correction by emailing{' '}
            <a
              href={`mailto:${contact.email}`}
              className='text-primary underline'
            >
              {contact.email}
            </a>
            . Consent is required before you submit this form.
          </p>
        </div>
      </form>
    </div>
  );
}
