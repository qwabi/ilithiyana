'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { percentageToBand, percentageToLevel, BAND_GOALS } from '@/lib/reports/nsc';
import type { ClassBand } from '@/lib/reports/nsc';
import { offeredSubjectOptions } from '@/lib/reports/subjects';
import {
  confirmReportResults,
  sendReportConfirmReminder,
  type ExtractionInput,
} from '@/app/actions/report-actions';
import toast from 'react-hot-toast';

export type ExtractionRow = {
  id: string;
  subject_name_raw: string;
  subject_name_clean: string;
  percentage: number | null;
  level: number | null;
  band: string | null;
  needs_review: boolean;
  is_offered: boolean;
};

const bandStyles: Record<ClassBand, string> = {
  A: 'bg-red-50 text-red-900 border-red-200',
  B: 'bg-amber-50 text-amber-900 border-amber-200',
  C: 'bg-blue-50 text-blue-900 border-blue-200',
  D: 'bg-emerald-50 text-emerald-900 border-emerald-200',
};

function RowBandBadge({ band }: { band: ClassBand | null }) {
  if (!band) return <span className='text-muted-foreground'>—</span>;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${bandStyles[band]}`}
      title={BAND_GOALS[band]}
    >
      {band}
    </span>
  );
}

export function ReportConfirmForm({
  learnerName,
  reportId,
  ocrFailed,
  initialRows,
}: {
  learnerName: string;
  reportId: string;
  ocrFailed: boolean;
  initialRows: ExtractionRow[];
}) {
  const offered = useMemo(
    () => initialRows.filter((r) => r.is_offered),
    [initialRows]
  );

  const [rows, setRows] = useState(
    offered.map((r) => ({
      id: r.id,
      subject_name_raw: r.subject_name_raw,
      subject_name_clean: r.subject_name_clean,
      percentage: r.percentage,
      is_offered: true,
      wrong_subject: false,
    }))
  );
  const [pending, startTransition] = useTransition();
  const needsReview = initialRows.some((r) => r.needs_review) || ocrFailed;

  const updatePct = (index: number, value: string) => {
    const pct = value === '' ? null : Math.min(100, Math.max(0, Number(value)));
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], percentage: pct };
      return next;
    });
  };

  const addSubject = () => {
    setRows((prev) => [
      ...prev,
      {
        id: '',
        subject_name_raw: '',
        subject_name_clean: offeredSubjectOptions()[0],
        percentage: null,
        is_offered: true,
        wrong_subject: false,
      },
    ]);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      const payload: ExtractionInput[] = rows.map((r) => ({
        id: r.id || undefined,
        subject_name_raw: r.subject_name_raw || r.subject_name_clean,
        subject_name_clean: r.subject_name_clean,
        percentage: r.percentage,
        is_offered: r.is_offered,
        wrong_subject: r.wrong_subject,
      }));

      const missing = payload.some((r) => r.percentage == null);
      if (missing) {
        toast.error('Enter a percentage for each subject');
        return;
      }

      const result = await confirmReportResults(reportId, payload);
      if (!result.ok) {
        toast.error(result.error ?? 'Could not save');
        return;
      }
      toast.success('Results confirmed — we are placing classes');
      window.location.href = '/dashboard/schedules';
    });
  };

  const handleLater = () => {
    startTransition(async () => {
      await sendReportConfirmReminder(reportId);
      toast.success('We will email you a reminder link');
      window.location.href = '/dashboard/reports';
    });
  };

  return (
    <div className='space-y-6'>
      {needsReview && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          Some results could not be read clearly. Please check the highlighted
          fields and enter the correct values.
        </div>
      )}

      {ocrFailed && rows.length === 0 && (
        <p className='text-sm text-muted-foreground'>
          We could not read the report automatically. Please enter your
          child&apos;s marks below.
        </p>
      )}

      <div className='overflow-x-auto rounded-lg border'>
        <table className='w-full min-w-[640px] text-sm'>
          <thead className='bg-muted/50 text-left'>
            <tr>
              <th className='px-4 py-3 font-medium'>Subject</th>
              <th className='px-4 py-3 font-medium'>% Mark</th>
              <th className='px-4 py-3 font-medium'>Level</th>
              <th className='px-4 py-3 font-medium'>Band</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const level =
                row.percentage != null ? percentageToLevel(row.percentage) : null;
              const band =
                row.percentage != null
                  ? (percentageToBand(row.percentage) as ClassBand)
                  : null;
              const highlight = initialRows.find((r) => r.id === row.id)?.needs_review;

              return (
                <tr
                  key={row.id || `new-${i}`}
                  className={highlight ? 'bg-amber-50/50' : 'border-t'}
                >
                  <td className='px-4 py-3'>
                    {row.id ? (
                      row.subject_name_clean
                    ) : (
                      <Select
                        value={row.subject_name_clean}
                        onValueChange={(v) =>
                          setRows((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], subject_name_clean: v };
                            return n;
                          })
                        }
                      >
                        <SelectTrigger className='h-9'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {offeredSubjectOptions().map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    <Input
                      type='number'
                      min={0}
                      max={100}
                      className='h-9 w-24'
                      value={row.percentage ?? ''}
                      onChange={(e) => updatePct(i, e.target.value)}
                    />
                  </td>
                  <td className='px-4 py-3 tabular-nums'>{level ?? '—'}</td>
                  <td className='px-4 py-3'>
                    <RowBandBadge band={band} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button type='button' variant='outline' onClick={addSubject}>
        Add a subject not shown
      </Button>

      <div className='flex flex-wrap items-center gap-3'>
        <Button
          type='button'
          disabled={pending}
          className='rounded-full bg-[hsl(43,96%,56%)] text-[hsl(210,100%,15%)] hover:bg-[hsl(43,96%,50%)]'
          onClick={handleConfirm}
        >
          These results are correct — confirm
        </Button>
        <button
          type='button'
          className='text-sm text-muted-foreground underline-offset-4 hover:underline'
          disabled={pending}
          onClick={handleLater}
        >
          I&apos;ll do this later
        </button>
      </div>

      <p className='text-xs text-muted-foreground'>
        After you confirm, {learnerName} will be placed into the right class
        bands. You will hear from us within 24 hours.
      </p>
    </div>
  );
}
