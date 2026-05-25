'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { uploadLearnerReport } from '@/app/actions/report-actions';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Year End'];

export default function UploadReportFilePage() {
  const params = useParams();
  const router = useRouter();
  const learnerId = params.learner_id as string;

  const [file, setFile] = useState<File | null>(null);
  const [term, setTerm] = useState('Term 2');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (f.type && !allowed.includes(f.type)) {
      setError('Please upload a PDF or image file (JPG, PNG, WEBP).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be smaller than 10MB.');
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleSubmit() {
    if (!file) {
      setError('Please select a file.');
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('term', term);
    fd.append('academicYear', year);

    startTransition(async () => {
      const result = await uploadLearnerReport(learnerId, fd);
      if (!result.ok) {
        setError(result.error ?? 'Upload failed. Please try again.');
        return;
      }
      if (result.reportId) {
        router.push(`/dashboard/reports/confirm/${result.reportId}`);
      } else {
        router.push(`/dashboard/reports/${learnerId}`);
      }
    });
  }

  return (
    <div className='mx-auto max-w-lg'>
      <Link
        href={`/dashboard/reports/${learnerId}/upload`}
        className='text-sm text-muted-foreground hover:underline'
      >
        ← Back to entry options
      </Link>
      <h1 className='mt-4 [font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)]'>
        Upload school report
      </h1>
      <p className='mt-1 text-sm text-muted-foreground'>
        We will scan the report to extract subject marks. You will confirm
        the results before we update class placement.
      </p>

      <div className='mt-6 space-y-5 rounded-xl border border-border bg-white p-6'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <label className='mb-1 block text-xs font-semibold text-foreground'>
              Term
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className='w-full rounded-lg border border-input px-3 py-2 text-sm'
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
              onChange={(e) => setYear(e.target.value)}
              className='w-full rounded-lg border border-input px-3 py-2 text-sm'
            >
              {[2026, 2025, 2024].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          role='button'
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            file
              ? 'border-primary/50 bg-[hsl(210,100%,98%)]'
              : 'border-border hover:border-primary/40 hover:bg-muted/30'
          }`}
        >
          <input
            ref={inputRef}
            type='file'
            accept='.pdf,.jpg,.jpeg,.png,.webp'
            onChange={handleFile}
            className='hidden'
          />
          {file ? (
            <div className='flex items-center justify-center gap-2 text-primary'>
              <FileText size={20} />
              <span className='text-sm font-medium'>{file.name}</span>
            </div>
          ) : (
            <>
              <Upload className='mx-auto mb-2 text-muted-foreground' size={28} />
              <p className='text-sm font-medium text-foreground'>
                Click to upload report card
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                PDF, JPG, PNG or WEBP · max 10MB
              </p>
            </>
          )}
        </div>

        {error ? (
          <div className='flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'>
            <AlertCircle size={15} />
            {error}
          </div>
        ) : null}

        <div className='flex gap-3 pt-1'>
          <button
            type='button'
            onClick={() => router.back()}
            className='flex-1 rounded-full border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={!file || pending}
            className='flex-1 rounded-full bg-accent py-2.5 text-sm font-bold text-[hsl(210,100%,12%)] transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {pending ? 'Uploading…' : 'Upload and scan'}
          </button>
        </div>
      </div>
    </div>
  );
}
