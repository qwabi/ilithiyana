'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  getSubjectsForGrade,
  nscLevel,
  nscDescriptor,
  levelToBand,
  subjectDisplayName,
} from '@/lib/curriculum/subjects';
import { saveManualReport } from '@/app/actions/report-actions';

type ReportRow = {
  subjectId: string;
  percentage: string;
};

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Year End'];
const YEARS = [2026, 2025, 2024];

function levelColors(level: number) {
  if (level >= 6) return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
  if (level >= 4) return { bg: 'bg-blue-100', text: 'text-blue-800' };
  if (level >= 2) return { bg: 'bg-amber-100', text: 'text-amber-800' };
  return { bg: 'bg-red-100', text: 'text-red-800' };
}

export function ReportBuilderClient({
  learnerId,
  learnerName,
  grade,
}: {
  learnerId: string;
  learnerName: string;
  grade: number;
}) {
  const router = useRouter();
  const catalog = useMemo(
    () => getSubjectsForGrade(grade).filter((s) => s.is_offered),
    [grade]
  );

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [term, setTerm] = useState('Term 3');
  const [year, setYear] = useState(2026);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addRow() {
    const next = catalog.find((s) => !rows.some((r) => r.subjectId === s.id));
    if (!next) return;
    setRows((prev) => [...prev, { subjectId: next.id, percentage: '' }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const parsedRows = rows
    .map((r) => ({
      subjectId: r.subjectId,
      percentage: parseInt(r.percentage, 10),
    }))
    .filter((r) => !Number.isNaN(r.percentage));

  const subjectIds = parsedRows.map((r) => r.subjectId);
  const hasDuplicateSubjects =
    new Set(subjectIds).size !== subjectIds.length;

  const allFilled =
    rows.length > 0 &&
    rows.every((r) => {
      const pct = parseInt(r.percentage, 10);
      return !Number.isNaN(pct) && pct >= 0 && pct <= 100;
    });

  const hasMissingPct = rows.some((r) => r.percentage.trim() === '');

  function handleSave() {
    if (!allFilled || hasDuplicateSubjects) return;
    setError(null);

    startTransition(async () => {
      const result = await saveManualReport({
        learnerId,
        term,
        academicYear: year,
        rows: parsedRows,
      });

      if (!result.ok) {
        setError(result.error ?? 'Failed to save report. Please try again.');
        return;
      }

      if (result.reportId) {
        router.push(
          `/dashboard/reports/confirm/${result.reportId}?manual=true`
        );
      }
    });
  }

  const phase = grade <= 9 ? 'Junior Phase' : 'FET Phase';

  return (
    <div className='mx-auto max-w-2xl'>
      <div className='mb-6 mt-4'>
        <h1 className='[font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)]'>
          Enter report results
        </h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          {learnerName} · Grade {grade} · {phase}
        </p>
      </div>

      <div className='mb-4 rounded-xl border border-border bg-white p-5'>
        <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Report period
        </p>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='mb-1 block text-xs font-semibold text-foreground'>
              Term
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className='w-full rounded-lg border border-input bg-white px-3 py-2 text-sm'
            >
              {TERMS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className='mb-1 block text-xs font-semibold text-foreground'>
              Academic year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className='w-full rounded-lg border border-input bg-white px-3 py-2 text-sm'
            >
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className='mb-4 rounded-xl border border-border bg-white p-5'>
        <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Subject results
        </p>

        {rows.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            Add each subject from the list, then enter the percentage mark.
          </p>
        ) : null}

        {rows.map((row, idx) => {
          const sub = catalog.find((s) => s.id === row.subjectId);
          const pct = parseInt(row.percentage, 10);
          const level = !Number.isNaN(pct) ? nscLevel(pct) : null;
          const band = level !== null ? levelToBand(level) : null;
          const colors = level !== null ? levelColors(level) : null;

          return (
            <div
              key={`${row.subjectId}-${idx}`}
              className='mt-3 flex flex-wrap items-end gap-2 border-t border-border/60 pt-3 first:mt-0 first:border-t-0 first:pt-0'
            >
              <div className='min-w-[12rem] flex-1'>
                <label className='mb-1 block text-xs font-semibold text-foreground'>
                  Subject
                </label>
                <select
                  value={row.subjectId}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, subjectId: e.target.value } : r
                      )
                    )
                  }
                  className='w-full rounded-lg border border-input bg-white px-3 py-2 text-sm'
                >
                  {catalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {subjectDisplayName(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='mb-1 block text-xs font-semibold text-foreground'>
                  Mark (%)
                </label>
                <input
                  type='number'
                  min={0}
                  max={100}
                  placeholder='0–100'
                  value={row.percentage}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, percentage: e.target.value } : r
                      )
                    )
                  }
                  className={`w-24 rounded-lg border px-2 py-2 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary/20 ${
                    row.percentage === ''
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-input bg-white'
                  }`}
                />
              </div>
              {level !== null && colors ? (
                <div className='flex flex-wrap items-center gap-2 pb-0.5'>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors.bg} ${colors.text}`}
                  >
                    L{level}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-sm font-bold ${colors.bg} ${colors.text}`}
                  >
                    {band}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {nscDescriptor(level)}
                  </span>
                </div>
              ) : null}
              <button
                type='button'
                onClick={() => removeRow(idx)}
                className='mb-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive'
                aria-label='Remove subject'
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}

        <button
          type='button'
          onClick={addRow}
          disabled={rows.length >= catalog.length}
          className='mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50'
        >
          Add subject
        </button>
      </div>

      {hasDuplicateSubjects ? (
        <div className='mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900'>
          <AlertCircle size={15} />
          Each subject can only appear once.
        </div>
      ) : null}

      {hasMissingPct && rows.length > 0 ? (
        <div className='mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900'>
          <AlertCircle size={15} />
          Enter a percentage for every subject before saving.
        </div>
      ) : null}

      {error ? (
        <div className='mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700'>
          <AlertCircle size={15} />
          {error}
        </div>
      ) : null}

      <div className='flex gap-3'>
        <button
          type='button'
          onClick={() => router.back()}
          className='flex-1 rounded-full border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50'
        >
          Cancel
        </button>
        <button
          type='button'
          onClick={handleSave}
          disabled={!allFilled || hasDuplicateSubjects || pending}
          className='flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-bold text-[hsl(210,100%,12%)] transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40'
        >
          {pending ? (
            'Saving…'
          ) : (
            <>
              <CheckCircle size={16} />
              Save results
            </>
          )}
        </button>
      </div>
    </div>
  );
}
