import { ApplicationTable } from '@/app/components/admin/ApplicationTable';
import { listApplications } from '@/app/actions/admin-actions';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function ApplicationsPage() {
  const { data, error } = await listApplications({});

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Applications</h1>
      <p className='mb-8 text-muted-foreground'>
        Review tutoring applications. Filter by province, grade, subject,
        package, or status. Export results or approve and reject pending
        applications.
      </p>
      <ApplicationTable initialApplications={data} initialError={error} />
    </div>
  );
}
