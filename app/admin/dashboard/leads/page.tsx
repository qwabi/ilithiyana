import { EnrollmentLeadsTable } from '@/app/components/admin/EnrollmentLeadsTable';
import { listEnrollmentLeads } from '@/app/actions/admin-actions';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function AdminLeadsPage() {
  const { data, error } = await listEnrollmentLeads({
    status: 'awaiting_payment',
  });

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Prospective parents</h1>
      <p className='mb-8 text-muted-foreground'>
        Enrolment leads from Apply Now — including abandoned checkouts for
        remarketing. Default filter shows awaiting payment.
      </p>
      <EnrollmentLeadsTable initialLeads={data} initialError={error} />
    </div>
  );
}
