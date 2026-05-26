'use client';

import { useRouter } from 'next/navigation';
import { DeleteReportButton } from '@/app/components/dashboard/DeleteReportButton';

export function ConfirmReportDeleteBar({
  reportId,
  term,
  academicYear,
}: {
  reportId: string;
  term: string;
  academicYear: number;
}) {
  const router = useRouter();

  return (
    <div className='mt-8 flex justify-center border-t pt-6'>
      <DeleteReportButton
        reportId={reportId}
        term={term}
        academicYear={academicYear}
        confirmed
        variant='card'
        onDeleted={() => router.push('/dashboard/reports')}
      />
    </div>
  );
}
