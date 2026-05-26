'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { StepHeader } from '@/components/onboarding/StepHeader';
import { ReportEntryInline } from '@/components/onboarding/ReportEntryInline';
import { LOCAL_STORAGE_SESSION_KEY } from '@/lib/onboarding/constants';
import toast from 'react-hot-toast';

type LearnerRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: number;
};

export function ReportsStepClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const sessionId = searchParams.get('session_id') ?? '';

  useEffect(() => {
    if (!sessionId) {
      router.replace('/onboarding/account');
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, sessionId);
    fetch(`/api/onboarding/learners?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((json) => setLearners(json.learners ?? []))
      .catch(console.error);
  }, [sessionId, router]);

  const finish = (reportsAdded: boolean) => {
    startTransition(async () => {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reportsAdded }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Could not finish');
        return;
      }
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      router.push('/onboarding/complete');
    });
  };

  return (
    <>
      <ProgressBar currentStep='reports' />
      <StepHeader
        title='School reports (optional)'
        description='Add recent marks manually to help us place your child in the right class. You can skip and add reports later from your dashboard.'
      />

      <div className='space-y-4'>
        {learners.map((learner) => (
          <ReportEntryInline
            key={learner.id}
            learnerId={learner.id}
            learnerName={`${learner.first_name} ${learner.last_name}`}
            grade={learner.grade}
            onSkip={() =>
              setSkipped((prev) => new Set(prev).add(learner.id))
            }
            onSaved={() =>
              setSkipped((prev) => new Set(prev).add(learner.id))
            }
          />
        ))}
      </div>

      <div className='mt-8 flex flex-col gap-3'>
        <Button
          type='button'
          className='w-full'
          onClick={() => finish(true)}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            'Finish enrolment'
          )}
        </Button>
        <Button
          type='button'
          variant='outline'
          className='w-full'
          onClick={() => finish(false)}
          disabled={pending}
        >
          Skip all reports for now
        </Button>
      </div>
    </>
  );
}
