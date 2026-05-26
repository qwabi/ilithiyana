'use client';

import { useCallback, useRef, useState } from 'react';
import { FileUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type DocumentUploadProps = {
  label?: string;
  hint?: string;
  accept?: string;
  maxSizeMb?: number;
  value?: File | null;
  onChange?: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
};

export function DocumentUpload({
  label = 'Upload document',
  hint = 'PDF or image, up to 10 MB',
  accept = '.pdf,.png,.jpg,.jpeg,.webp',
  maxSizeMb = 10,
  value,
  onChange,
  disabled,
  className,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSet = useCallback(
    (file: File | null) => {
      setError(null);
      if (!file) {
        onChange?.(null);
        return;
      }
      const maxBytes = maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`File must be under ${maxSizeMb} MB`);
        return;
      }
      onChange?.(file);
    },
    [maxSizeMb, onChange],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {hint ? <p className='text-xs text-muted-foreground'>{hint}</p> : null}

      <div
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragOver
            ? 'border-[#1B6CA8] bg-[#1B6CA8]/5'
            : 'border-border bg-[#F8FAFC] hover:border-[#1B6CA8]/50',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <FileUp className='mb-2 h-8 w-8 text-[#1B6CA8]' aria-hidden />
        <p className='text-sm font-medium text-[#0F2942]'>
          Drag and drop or click to browse
        </p>
        <p className='mt-1 text-xs text-muted-foreground'>{accept}</p>
      </div>

      <input
        ref={inputRef}
        type='file'
        accept={accept}
        className='sr-only'
        disabled={disabled}
        onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
      />

      {value ? (
        <div className='flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2'>
          <p className='truncate text-sm font-medium'>{value.name}</p>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              validateAndSet(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            aria-label='Remove file'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      ) : null}

      {error ? <p className='text-sm text-destructive'>{error}</p> : null}
    </div>
  );
}
