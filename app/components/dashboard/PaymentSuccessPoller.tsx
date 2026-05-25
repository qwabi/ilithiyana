'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function PaymentSuccessPoller({ reportId }: { reportId?: string | null }) {
  const [status, setStatus] = useState<'polling' | 'ready' | 'slow' | 'none'>(
    reportId ? 'polling' : 'none'
  );
  const [confirmUrl, setConfirmUrl] = useState<string | null>(
    reportId ? `/dashboard/reports/confirm/${reportId}` : null
  );

  useEffect(() => {
    if (!reportId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      if (cancelled || attempts >= maxAttempts) {
        if (!cancelled) setStatus('slow');
        return;
      }
      attempts++;

      try {
        const res = await fetch(`/api/reports/${reportId}/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.ready) {
            setStatus('ready');
            setConfirmUrl(json.confirmUrl);
            return;
          }
        }
      } catch {
        /* retry */
      }

      setTimeout(poll, 2000);
    };

    poll();
    const slowTimer = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'polling' ? 'slow' : s));
    }, 90000);

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [reportId]);

  if (status === 'none') return null;

  if (status === 'polling') {
    return (
      <div className='mx-auto mt-8 max-w-md rounded-lg border bg-white px-6 py-5 text-left'>
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Reading your school report…
        </div>
      </div>
    );
  }

  if (status === 'ready' && confirmUrl) {
    return (
      <div className='mx-auto mt-8 max-w-md rounded-lg border border-accent/30 bg-accent/5 px-6 py-5 text-left'>
        <p className='font-medium text-[hsl(210,100%,25%)]'>Report ready to review</p>
        <p className='mt-1 text-sm text-muted-foreground'>
          We extracted marks from the uploaded report. Please confirm they are
          correct so we can place your child in the right classes.
        </p>
        <Button asChild className='mt-4 rounded-full'>
          <Link href={confirmUrl}>Review and confirm results</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='mx-auto mt-8 max-w-md rounded-lg border bg-muted/30 px-6 py-5 text-left text-sm text-muted-foreground'>
      <p>
        We&apos;re still reading your report. You&apos;ll get an email with a link
        to confirm the results — usually within a few minutes.
      </p>
      {confirmUrl && (
        <Link href={confirmUrl} className='mt-3 inline-block text-primary underline'>
          Open confirmation page
        </Link>
      )}
    </div>
  );
}
