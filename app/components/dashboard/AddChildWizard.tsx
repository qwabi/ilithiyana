'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PayFastRedirectForm } from '@/app/components/PayFastRedirectForm';
import { startAddChildPayment } from '@/app/actions/add-child-actions';
import { packages, grades } from '@/lib/site-config';
import {
  getOfferedSubjectsForGrade,
  subjectDisplayName,
  nscLevel,
  nscDescriptor,
} from '@/lib/curriculum/subjects';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const PACKAGE_DETAILS = [
  {
    id: 'package-a' as const,
    title: 'Package A',
    price: 'R1,000/month',
    bullets: [
      '8 lessons per month',
      '4 hours career guidance',
      'Up to 4 subjects',
      'All grade levels',
    ],
  },
  {
    id: 'package-b' as const,
    title: 'Package B',
    price: 'R175/lesson',
    bullets: [
      'Pay per session',
      '4 hours career guidance',
      '1 hour per lesson',
      'Flexible booking',
    ],
  },
];

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Year End'];

async function uploadFile(file: File, leadId: string, purpose: 'proof') {
  const body = new FormData();
  body.append('file', file);
  body.append('purpose', purpose);
  body.append('leadId', leadId);
  const res = await fetch('/api/upload', { method: 'POST', body });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Upload failed');
  return { path: json.path as string, url: json.url as string | undefined };
}

export function AddChildWizard() {
  const [step, setStep] = useState(1);
  const [packageId, setPackageId] = useState<string>('');
  const [learnerFirstName, setLearnerFirstName] = useState('');
  const [learnerLastName, setLearnerLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [reportTerm, setReportTerm] = useState('Term 3');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportRows, setReportRows] = useState<
    { subjectId: string; percentage: string }[]
  >([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payfast, setPayfast] = useState<{
    processUrl: string;
    fields: Record<string, string>;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const leadIdRef = useRef('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const gradeNum = parseInt(grade, 10);
  const offered = useMemo(
    () => (gradeNum ? getOfferedSubjectsForGrade(gradeNum) : []),
    [gradeNum]
  );

  const offeredForSelection = useMemo(() => offered.filter((s) => s.id), [offered]);

  const reportCatalog = useMemo(
    () => offered.filter((s) => s.is_offered),
    [offered]
  );

  const handleGradeChange = (value: string) => {
    setGrade(value);
    setSubjects([]);
    setReportRows([]);
  };

  const toggleSubject = (subjectId: string) => {
    setSubjects((prev) => {
      if (prev.includes(subjectId)) return prev.filter((x) => x !== subjectId);
      if (prev.length >= 4) {
        toast.error('Maximum 4 subjects');
        return prev;
      }
      return [...prev, subjectId];
    });
  };

  const syncReportRowsFromSubjects = () => {
    const ids = new Set(subjects);
    setReportRows((prev) => {
      const kept = prev.filter((r) => ids.has(r.subjectId));
      Array.from(ids).forEach((id) => {
        if (!kept.some((r) => r.subjectId === id)) {
          kept.push({ subjectId: id, percentage: '' });
        }
      });
      return kept;
    });
  };

  const addReportRow = () => {
    const next = reportCatalog.find(
      (s) => !reportRows.some((r) => r.subjectId === s.id)
    );
    if (!next) return;
    setReportRows((prev) => [...prev, { subjectId: next.id, percentage: '' }]);
  };

  const parsedManualRows = reportRows
    .map((r) => ({
      subjectId: r.subjectId,
      percentage: parseInt(r.percentage, 10),
    }))
    .filter((r) => !Number.isNaN(r.percentage));

  const hasManualReport = parsedManualRows.length > 0;

  const handlePay = () => {
    if (hasSubmitted || pending) return;
    setHasSubmitted(true);
    startTransition(async () => {
      try {
        const leadId = leadIdRef.current;
        if (!leadId) {
          toast.error('Please go back and continue from learner details again.');
          setHasSubmitted(false);
          return;
        }
        let proofUrl: string | undefined;
        if (proofFile) {
          const proof = await uploadFile(proofFile, leadId, 'proof');
          proofUrl = proof.url;
        }

        const result = await startAddChildPayment({
          packageId,
          learnerFirstName,
          learnerLastName,
          dateOfBirth,
          schoolName,
          grade: Number(grade),
          subjects,
          leadId,
          manualReport: hasManualReport
            ? {
                term: reportTerm,
                academicYear: reportYear,
                rows: parsedManualRows,
              }
            : undefined,
          proofUrl,
        });

        if (!result.success) {
          toast.error(result.message);
          setHasSubmitted(false);
          return;
        }

        setPayfast({
          processUrl: result.processUrl,
          fields: result.fields,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not continue');
        setHasSubmitted(false);
      }
    });
  };

  const validateStep2 = (): boolean => {
    if (
      !learnerFirstName ||
      !learnerLastName ||
      !dateOfBirth ||
      !schoolName ||
      !grade ||
      subjects.length < 1
    ) {
      toast.error('Complete learner details and select at least one subject');
      return false;
    }
    if (!hasManualReport) {
      toast.error('Enter marks for at least one subject in the school report section');
      return false;
    }
    if (hasManualReport) {
      const invalid = reportRows.some(
        (r) =>
          r.percentage === '' ||
          Number.isNaN(parseInt(r.percentage, 10)) ||
          parseInt(r.percentage, 10) < 0 ||
          parseInt(r.percentage, 10) > 100
      );
      if (invalid) {
        toast.error('Enter a percentage (0–100) for each report subject');
        return false;
      }
    }
    return true;
  };

  if (payfast) {
    return (
      <div className='py-12 text-center'>
        <Loader2 className='mx-auto h-10 w-10 animate-spin text-primary' />
        <p className='mt-4 text-muted-foreground'>Redirecting to PayFast…</p>
        <PayFastRedirectForm action={payfast.processUrl} fields={payfast.fields} />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      <p className='text-sm text-muted-foreground'>Step {step} of 3</p>

      {step === 1 && (
        <div className='grid gap-4 md:grid-cols-2'>
          {PACKAGE_DETAILS.map((pkg) => (
            <Card
              key={pkg.id}
              className={cn(
                'cursor-pointer rounded-xl border-2 bg-white transition-colors',
                packageId === pkg.id
                  ? 'border-primary'
                  : 'border-border hover:border-primary/40'
              )}
              onClick={() => setPackageId(pkg.id)}
            >
              <CardContent className='relative p-6'>
                {packageId === pkg.id && (
                  <Check className='absolute right-4 top-4 h-5 w-5 text-primary' />
                )}
                <h3 className='font-medium text-[hsl(210,100%,25%)]'>{pkg.title}</h3>
                <p className='text-lg font-semibold'>{pkg.price}</p>
                <ul className='mt-3 list-disc space-y-1 pl-4 text-sm text-muted-foreground'>
                  {pkg.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
          <div className='md:col-span-2'>
            <Button
              disabled={!packageId}
              onClick={() => setStep(2)}
              className='rounded-full bg-primary text-white'
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className='space-y-6 rounded-xl border border-border bg-white p-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <Label>Learner first name</Label>
              <Input
                value={learnerFirstName}
                onChange={(e) => setLearnerFirstName(e.target.value)}
                className='mt-1'
                required
              />
            </div>
            <div>
              <Label>Learner surname</Label>
              <Input
                value={learnerLastName}
                onChange={(e) => setLearnerLastName(e.target.value)}
                className='mt-1'
                required
              />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input
                type='date'
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className='mt-1'
                required
              />
            </div>
            <div>
              <Label>School name</Label>
              <Input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className='mt-1'
                required
              />
            </div>
            <div>
              <Label>Current grade</Label>
              <Select value={grade} onValueChange={handleGradeChange}>
                <SelectTrigger className='mt-1'>
                  <SelectValue placeholder='Select grade' />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {gradeNum ? (
            <div>
              <Label>Subjects for tutoring (max 4)</Label>
              <p className='mt-1 text-xs text-muted-foreground'>
                Options match CAPS subjects we offer for Grade {gradeNum}.
              </p>
              <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                {offeredForSelection.length > 0 ? (
                  offeredForSelection.map((sub) => (
                    <label
                      key={sub.id}
                      className='flex items-center gap-2 text-sm'
                    >
                      <Checkbox
                        checked={subjects.includes(sub.id)}
                        onCheckedChange={() => {
                          toggleSubject(sub.id);
                        }}
                      />
                      {subjectDisplayName(sub)}
                    </label>
                  ))
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    No tutoring subjects listed for this grade yet. Contact us
                    for help.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>
              Select a grade to see available subjects.
            </p>
          )}

          <div className='rounded-lg border border-border bg-muted/30 p-4'>
            <h3 className='text-sm font-semibold text-[hsl(210,100%,25%)]'>
              School report
            </h3>
            <p className='mt-1 text-xs text-muted-foreground'>
              Enter recent marks per subject. We use this to place your child in
              the right class.
            </p>

            {subjects.length > 0 && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-3'
                onClick={syncReportRowsFromSubjects}
              >
                Copy selected subjects into report
              </Button>
            )}

            <div className='mt-4 grid gap-3 sm:grid-cols-2'>
              <div>
                <Label>Term</Label>
                <select
                  className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                  value={reportTerm}
                  onChange={(e) => setReportTerm(e.target.value)}
                >
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type='number'
                  className='mt-1'
                  value={reportYear}
                  onChange={(e) =>
                    setReportYear(parseInt(e.target.value, 10) || reportYear)
                  }
                />
              </div>
            </div>

            {reportRows.map((row, idx) => {
              const sub = reportCatalog.find((s) => s.id === row.subjectId);
              const pct = parseInt(row.percentage, 10);
              const level = !Number.isNaN(pct) ? nscLevel(pct) : null;
              return (
                <div
                  key={`${row.subjectId}-${idx}`}
                  className='mt-3 flex flex-wrap items-end gap-2'
                >
                  <select
                    className='rounded-md border border-input px-2 py-2 text-sm'
                    value={row.subjectId}
                    onChange={(e) =>
                      setReportRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, subjectId: e.target.value } : r
                        )
                      )
                    }
                  >
                    {reportCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {subjectDisplayName(s)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type='number'
                    min={0}
                    max={100}
                    placeholder='%'
                    className='w-20'
                    value={row.percentage}
                    onChange={(e) =>
                      setReportRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, percentage: e.target.value } : r
                        )
                      )
                    }
                  />
                  {level != null ? (
                    <span className='text-xs text-muted-foreground'>
                      Level {level} — {nscDescriptor(level)}
                    </span>
                  ) : null}
                </div>
              );
            })}

            <Button
              type='button'
              variant='outline'
              size='sm'
              className='mt-3'
              onClick={addReportRow}
              disabled={!gradeNum}
            >
              Add subject mark
            </Button>

            <div className='mt-3'>
              <Label>Proof of previous payment (optional)</Label>
              <Input
                type='file'
                accept='.pdf,image/*'
                className='mt-1'
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => {
                if (!validateStep2()) return;
                if (!leadIdRef.current) {
                  leadIdRef.current = crypto.randomUUID();
                }
                setStep(3);
              }}
              className='rounded-full bg-primary text-white'
            >
              Continue to payment
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className='rounded-xl border border-border bg-white p-6 text-center'>
          <p className='text-muted-foreground'>
            Package: {packages.find((p) => p.id === packageId)?.name}
          </p>
          <p className='mt-2 font-medium'>
            {learnerFirstName} {learnerLastName} · Grade {grade}
          </p>
          {hasManualReport ? (
            <p className='mt-2 text-sm text-muted-foreground'>
              Report: {reportTerm} {reportYear} · {parsedManualRows.length}{' '}
              subject{parsedManualRows.length === 1 ? '' : 's'}
            </p>
          ) : null}
          <p className='mt-4 text-sm text-muted-foreground'>
            You will be redirected to PayFast to complete payment. Each child
            addition requires a new subscription payment.
          </p>
          <div className='mt-6 flex justify-center gap-2'>
            <Button variant='outline' onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              disabled={pending}
              onClick={handlePay}
              className='rounded-full bg-accent text-[hsl(210,100%,12%)] hover:bg-accent/90'
            >
              {pending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Processing…
                </>
              ) : (
                'Pay with PayFast'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
