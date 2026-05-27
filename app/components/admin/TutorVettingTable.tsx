'use client';

import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/portal/StatusBadge';
import {
  fetchTutorDocumentsForAdmin,
  setTutorVettingStatus,
} from '@/lib/tutor/actions';

type PendingRow = {
  id: string;
  vetting_status: string;
  phone: string | null;
  province: string | null;
  tutors: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    subjects: string[];
    created_at: string;
  } | null;
};

export function TutorVettingTable({
  initialRows,
  initialError,
}: {
  initialRows: PendingRow[];
  initialError?: string;
}) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState(initialError ?? null);
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handle = (tutorId: string, status: 'approved' | 'rejected') => {
    startTransition(async () => {
      const result = await setTutorVettingStatus(
        tutorId,
        status,
        notes[tutorId]
      );
      if (!result.ok) {
        toast.error(result.error ?? 'Update failed');
        return;
      }
      toast.success(`Tutor ${status}`);
      setRows((prev) => prev.filter((r) => r.tutors?.id !== tutorId));
    });
  };

  const viewDocs = async (tutorId: string) => {
    const result = await fetchTutorDocumentsForAdmin(tutorId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const urls = result.data
      .filter((d) => d.signedUrl)
      .map((d) => d.signedUrl as string);
    if (!urls.length) {
      toast.error('No documents available');
      return;
    }
    urls.forEach((url) => window.open(url, '_blank'));
  };

  if (error) {
    return <p className='text-sm text-destructive'>{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>No tutors awaiting vetting.</p>
    );
  }

  return (
    <div className='space-y-4'>
      {pending && (
        <p className='text-sm text-muted-foreground'>Updating…</p>
      )}
      {rows.map((row) => {
        const tutor = row.tutors;
        if (!tutor) return null;
        return (
          <Card key={row.id}>
            <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2 pb-2'>
              <CardTitle className='text-lg'>
                {tutor.first_name} {tutor.last_name}
              </CardTitle>
              <StatusBadge status={row.vetting_status} />
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <p>{tutor.email}</p>
              <p className='text-muted-foreground'>
                {row.province ?? '—'} · {tutor.subjects.join(', ')}
              </p>
              <textarea
                className='w-full rounded-md border border-input px-3 py-2 text-sm'
                placeholder='Notes (optional, shown on rejection)'
                value={notes[tutor.id] ?? ''}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [tutor.id]: e.target.value }))
                }
                rows={2}
              />
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => viewDocs(tutor.id)}
                >
                  View documents
                </Button>
                <Button
                  type='button'
                  size='sm'
                  className='bg-emerald-600 hover:bg-emerald-700'
                  disabled={pending}
                  onClick={() => handle(tutor.id, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='destructive'
                  disabled={pending}
                  onClick={() => handle(tutor.id, 'rejected')}
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
