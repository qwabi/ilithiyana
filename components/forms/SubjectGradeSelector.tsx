'use client';

import { grades, subjects, type Subject } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SubjectGradeSelectorProps = {
  grade?: number | '';
  onGradeChange?: (grade: number | '') => void;
  selectedSubjects?: Subject[];
  onSubjectsChange?: (subjects: Subject[]) => void;
  /** Override default subject list from site-config */
  subjectOptions?: readonly Subject[];
  maxSubjects?: number;
  disabled?: boolean;
  className?: string;
  gradeLabel?: string;
  subjectsLabel?: string;
};

export function SubjectGradeSelector({
  grade = '',
  onGradeChange,
  selectedSubjects = [],
  onSubjectsChange,
  subjectOptions = subjects,
  maxSubjects = 4,
  disabled,
  className,
  gradeLabel = 'Grade',
  subjectsLabel = 'Subjects',
}: SubjectGradeSelectorProps) {
  const toggleSubject = (subject: Subject) => {
    if (!onSubjectsChange || disabled) return;
    if (selectedSubjects.includes(subject)) {
      onSubjectsChange(selectedSubjects.filter((s) => s !== subject));
      return;
    }
    if (selectedSubjects.length >= maxSubjects) return;
    onSubjectsChange([...selectedSubjects, subject]);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className='space-y-2'>
        <Label htmlFor='subject-grade-select'>{gradeLabel}</Label>
        <Select
          value={grade === '' ? '' : String(grade)}
          onValueChange={(v) =>
            onGradeChange?.(v === '' ? '' : Number.parseInt(v, 10))
          }
          disabled={disabled}
        >
          <SelectTrigger id='subject-grade-select' className='max-w-xs'>
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

      <div className='space-y-3' role='group' aria-labelledby='subject-grade-list-label'>
        <div className='flex items-baseline justify-between gap-2'>
          <Label id='subject-grade-list-label'>{subjectsLabel}</Label>
          <span className='text-xs text-muted-foreground'>
            {selectedSubjects.length}/{maxSubjects} selected
          </span>
        </div>
        <div className='flex flex-wrap gap-2'>
          {subjectOptions.map((subject) => {
            const selected = selectedSubjects.includes(subject);
            const atLimit =
              !selected && selectedSubjects.length >= maxSubjects;
            return (
              <button
                key={subject}
                type='button'
                disabled={disabled || atLimit}
                aria-pressed={selected}
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubject(subject);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  selected
                    ? 'border-[#1B6CA8] bg-[#1B6CA8] text-white'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                  (disabled || atLimit) &&
                    'cursor-not-allowed opacity-60 hover:bg-background',
                )}
              >
                {subject}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
