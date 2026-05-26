import Link from 'next/link';
import { format } from 'date-fns';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { AdminEntityTable } from '@/app/components/admin/AdminEntityTable';
import { fetchReports } from '@/app/actions/admin-actions';

type ReportRow = {
  id: string;
  term: string;
  academic_year: number;
  ocr_status: string;
  confirmed: boolean;
  uploaded_at: string;
  learners: {
    id: string;
    first_name: string;
    last_name: string;
    grade: number;
  } | null;
};

export default async function ReportsPage() {
  const { data, error } = await fetchReports();

  return (
    <AdminShell
      title='School reports'
      description='Learner report uploads — OCR status and parent confirmation.'
    >
      {error ? <p className='mb-4 text-sm text-destructive'>{error}</p> : null}
      <AdminEntityTable
        rows={data as ReportRow[]}
        hrefForRow={(row) =>
          row.learners
            ? `/admin/dashboard/learners/${row.learners.id}`
            : `/admin/dashboard/reports`
        }
        columns={[
          {
            key: 'learner',
            header: 'Learner',
            cell: (r) =>
              r.learners
                ? `${r.learners.first_name} ${r.learners.last_name}`
                : '—',
          },
          {
            key: 'term',
            header: 'Term',
            cell: (r) => `${r.term} ${r.academic_year}`,
          },
          {
            key: 'ocr',
            header: 'OCR',
            cell: (r) => <span className='capitalize'>{r.ocr_status}</span>,
          },
          {
            key: 'confirmed',
            header: 'Confirmed',
            cell: (r) => (r.confirmed ? 'Yes' : 'No'),
          },
          {
            key: 'uploaded',
            header: 'Uploaded',
            cell: (r) => format(new Date(r.uploaded_at), 'd MMM yyyy'),
          },
        ]}
      />
    </AdminShell>
  );
}
