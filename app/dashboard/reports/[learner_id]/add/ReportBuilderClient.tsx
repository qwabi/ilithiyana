'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  getSubjectsForGrade,
  nscLevel,
  nscDescriptor,
  levelToBand,
  subjectDisplayName,
  type SubjectEntry,
} from '@/lib/curriculum/subjects';
import { saveManualReport } from '@/app/actions/report-actions';

type AddedSubject = {
  subject: SubjectEntry;
  percentage: number | '';
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
  const allSubjects = useMemo(() => getSubjectsForGrade(grade), [grade]);

  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<AddedSubject[]>([]);
  const [term, setTerm] = useState('Term 3');
  const [year, setYear] = useState(2026);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const addedIds = new Set(added.map((a) => a.subject.id));
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allSubjects
      .filter(
        (s) =>
          !addedIds.has(s.id) &&
          (s.name.toLowerCase().includes(q) ||
            (s.requires_level?.toLowerCase().includes(q) ?? false))
      )
      .slice(0, 8);
  }, [query, allSubjects, addedIds]);

  function addSubject(subject: SubjectEntry) {
    setAdded((prev) => [...prev, { subject, percentage: '' }]);
    setQuery('');
  }

  function removeSubject(id: string) {
    setAdded((prev) => prev.filter((a) => a.subject.id !== id));
  }

  function updatePercentage(id: string, value: string) {
    const num = parseInt(value, 10);
    setAdded((prev) =>
      prev.map((a) =>
        a.subject.id === id
          ? {
              ...a,
              percentage: Number.isNaN(num)
                ? ''
                : Math.min(100, Math.max(0, num)),
            }
          : a
      )
    );
  }

  const allFilled =
    added.length > 0 && added.every((a) => a.percentage !== '');
  const hasMissingPct = added.some((a) => a.percentage === '');

  function handleSave() {
    if (!allFilled) return;
    setError(null);

    startTransition(async () => {
      const result = await saveManualReport({
        learnerId,
        term,
        academicYear: year,
        rows: added.map((a) => ({
          subjectId: a.subject.id,
          percentage: a.percentage as number,
        })),
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
          Add subjects
        </p>
        <div className='relative'>
          <Search
            className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            size={16}
          />
          <input
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search subjects — e.g. Mathematics, English HL, Life Sciences…'
            className='w-full rounded-lg border border-input py-2.5 pl-9 pr-4 text-sm
                       focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20'
          />
        </div>

        {searchResults.length > 0 && (
          <div className='mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border'>
            {searchResults.map((subject) => (
              <button
                key={subject.id}
                type='button'
                onClick={() => addSubject(subject)}
                className='group flex w-full items-center justify-between px-4 py-3
                           text-left text-sm transition-colors hover:bg-[hsl(210,100%,98%)]'
              >
                <div>
                  <span className='font-medium text-foreground'>
                    {subjectDisplayName(subject)}
                  </span>
                  {subject.is_offered ? (
                    <span className='ml-2 rounded-full bg-[hsl(210,100%,96%)] px-1.5 py-0.5 text-xs font-semibold text-[hsl(210,100%,35%)]'>
                      IA tutoring available
                    </span>
                  ) : null}
                </div>
                <Plus
                  size={16}
                  className='shrink-0 text-muted-foreground transition-colors group-hover:text-primary'
                />
              </button>
            ))}
          </div>
        )}

        {query.trim() && searchResults.length === 0 ? (
          <p className='mt-2 px-1 text-xs text-muted-foreground'>
            No subjects found for &quot;{query}&quot;. Try a different search term.
          </p>
        ) : null}
      </div>

      {added.length > 0 ? (
        <div className='mb-4 overflow-hidden rounded-xl border border-border bg-white'>
          <div className='flex items-center justify-between border-b border-border px-5 py-3'>
            <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Subject results
            </p>
            <p className='text-xs text-muted-foreground'>
              {added.length} subject{added.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className='grid grid-cols-[1fr_90px_70px_60px_32px] gap-2 border-b border-border bg-muted/30 px-5 py-2'>
            <p className='text-xs font-semibold text-muted-foreground'>Subject</p>
            <p className='text-center text-xs font-semibold text-muted-foreground'>
              Mark (%)
            </p>
            <p className='text-center text-xs font-semibold text-muted-foreground'>
              Level
            </p>
            <p className='text-center text-xs font-semibold text-muted-foreground'>
              Band
            </p>
            <span />
          </div>

          <div className='divide-y divide-border/60'>
            {added.map((item) => {
              const pct = item.percentage;
              const level = typeof pct === 'number' ? nscLevel(pct) : null;
              const band = level !== null ? levelToBand(level) : null;
              const colors = level !== null ? levelColors(level) : null;

              return (
                <div
                  key={item.subject.id}
                  className='grid grid-cols-[1fr_90px_70px_60px_32px] items-center gap-2 px-5 py-3'
                >
                  <div>
                    <p className='text-sm font-medium leading-tight text-foreground'>
                      {subjectDisplayName(item.subject)}
                    </p>
                  </div>
                  <input
                    type='number'
                    min={0}
                    max={100}
                    value={pct}
                    onChange={(e) =>
                      updatePercentage(item.subject.id, e.target.value)
                    }
                    placeholder='0–100'
                    className={`w-full rounded-lg border px-2 py-1.5 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary/20 ${
                      pct === ''
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-input bg-white'
                    }`}
                  />
                  <div className='flex justify-center'>
                    {level !== null && colors ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors.bg} ${colors.text}`}
                      >
                        L{level}
                      </span>
                    ) : (
                      <span className='text-xs text-muted-foreground'>—</span>
                    )}
                  </div>
                  <div className='flex justify-center'>
                    {band !== null && colors ? (
                      <span
                        className={`rounded px-2 py-0.5 text-sm font-bold ${colors.bg} ${colors.text}`}
                      >
                        {band}
                      </span>
                    ) : (
                      <span className='text-xs text-muted-foreground'>—</span>
                    )}
                  </div>
                  <button
                    type='button'
                    onClick={() => removeSubject(item.subject.id)}
                    className='flex justify-center text-muted-foreground transition-colors hover:text-destructive'
                    aria-label='Remove subject'
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>

          {added.some((a) => a.percentage !== '') ? (
            <div className='border-t border-border bg-muted/20 px-5 py-3'>
              <p className='mb-1 text-xs font-medium text-muted-foreground'>
                NSC rating scale
              </p>
              <div className='flex flex-wrap gap-1.5'>
                {[7, 6, 5, 4, 3, 2, 1].map((lvl) => {
                  const c = levelColors(lvl);
                  return (
                    <span
                      key={lvl}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
                    >
                      {lvl} — {nscDescriptor(lvl).split(' ')[0]}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className='py-8 text-center text-sm text-muted-foreground'>
          Search for a subject above to get started.
        </p>
      )}

      {hasMissingPct ? (
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
          disabled={!allFilled || pending}
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
