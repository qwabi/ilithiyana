'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getSubjectsForGrade,
  subjectDisplayName,
  nscLevel,
  nscDescriptor,
} from '@/lib/curriculum/subjects';
import { saveManualReport } from '@/app/actions/report-actions';
import toast from 'react-hot-toast';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Year End'];

export function ReportEntryInline({
  learnerId,
  learnerName,
  grade,
  onSaved,
  onSkip,
}: {
  learnerId: string;
  learnerName: string;
  grade: number;
  onSaved?: () => void;
  onSkip: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('Term 3');
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<{ subjectId: string; percentage: string }[]>(
    []
  );
  const [pending, startTransition] = useTransition();

  const catalog = getSubjectsForGrade(grade).filter((s) => s.is_offered);

  const addRow = () => {
    const next = catalog.find((s) => !rows.some((r) => r.subjectId === s.id));
    if (!next) return;
    setRows((prev) => [...prev, { subjectId: next.id, percentage: '' }]);
  };

  const handleSave = () => {
    const parsed = rows
      .map((r) => ({
        subjectId: r.subjectId,
        percentage: parseInt(r.percentage, 10),
      }))
      .filter((r) => !Number.isNaN(r.percentage));

    if (!parsed.length) {
      toast.error('Add at least one subject with a percentage');
      return;
    }

    startTransition(async () => {
      const result = await saveManualReport({
        learnerId,
        term,
        academicYear: year,
        rows: parsed,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Report saved');
      onSaved?.();
      setOpen(false);
    });
  };

  return (
    <div className='rounded-xl border border-border bg-card'>
      <button
        type='button'
        className='flex w-full items-center justify-between px-4 py-3 text-left'
        onClick={() => setOpen((v) => !v)}
      >
        <span className='font-medium text-[hsl(210,100%,25%)]'>{learnerName}</span>
        {open ? (
          <ChevronUp className='h-4 w-4 text-muted-foreground' />
        ) : (
          <ChevronDown className='h-4 w-4 text-muted-foreground' />
        )}
      </button>

      {open ? (
        <div className='border-t border-border px-4 pb-4 pt-2'>
          <p className='text-xs text-muted-foreground'>
            Optional — enter recent marks manually (no file upload).
          </p>
          <div className='mt-3 grid gap-3 sm:grid-cols-2'>
            <div>
              <Label>Term</Label>
              <select
                className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                value={term}
                onChange={(e) => setTerm(e.target.value)}
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
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
              />
            </div>
          </div>

          {rows.map((row, idx) => {
            const sub = catalog.find((s) => s.id === row.subjectId);
            const pct = parseInt(row.percentage, 10);
            const level = !Number.isNaN(pct) ? nscLevel(pct) : null;
            return (
              <div key={idx} className='mt-3 flex flex-wrap items-end gap-2'>
                <select
                  className='rounded-md border border-input px-2 py-2 text-sm'
                  value={row.subjectId}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, i) =>
                        i === idx ? { ...r, subjectId: e.target.value } : r
                      )
                    )
                  }
                >
                  {catalog.map((s) => (
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
                    setRows((prev) =>
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

          <div className='mt-3 flex flex-wrap gap-2'>
            <Button type='button' variant='outline' size='sm' onClick={addRow}>
              Add subject
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Save report'}
            </Button>
            <Button type='button' variant='ghost' size='sm' onClick={onSkip}>
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <div className='border-t border-border px-4 py-3'>
          <Button type='button' variant='ghost' size='sm' onClick={onSkip}>
            Skip for now
          </Button>
        </div>
      )}
    </div>
  );
}
