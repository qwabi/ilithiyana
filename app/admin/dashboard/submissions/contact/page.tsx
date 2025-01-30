'use client';

import { useEffect, Suspense } from 'react';
import { getSubmissions } from '@/lib/blob-storage';
import { SubmissionCard } from '@/app/components/admin/SubmissionCard';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

export default function ContactSubmissions() {
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const submissions = await getSubmissions('contact');
        toast.success(`Loaded ${submissions.length} contact submissions`);
      } catch (error) {
        toast.error('Failed to load contact submissions');
      }
    };

    fetchSubmissions();
  }, []);

  return (
    <div>
      <h1 className='text-3xl font-bold mb-6'>Contact Submissions</h1>
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        <Suspense fallback={<Loading />}>
          <SubmissionList />
        </Suspense>
      </div>
    </div>
  );
}

async function SubmissionList() {
  const submissions = await getSubmissions('contact');

  return (
    <>
      {submissions.map((submission) => (
        <SubmissionCard
          key={submission.id}
          type='Contact'
          title={submission.title}
          date={new Date(submission.date)}
          status={submission.status}
          details={submission.details}
        />
      ))}
    </>
  );
}

function Loading() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className='h-[300px] w-full' />
      ))}
    </>
  );
}
