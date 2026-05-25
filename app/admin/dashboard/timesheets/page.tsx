import { TimesheetsTable } from '@/app/components/admin/TimesheetsTable';
import { fetchTimesheets } from '@/app/actions/admin-actions';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function TimesheetsPage() {
  const { data, error } = await fetchTimesheets();

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Tutor timesheets</h1>
      <p className='mb-8 text-muted-foreground'>
        Review submitted session logs and approve or reject tutor payroll.
      </p>
      <TimesheetsTable initialRows={data} initialError={error} />
    </div>
  );
}
