import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/portal/StatusBadge';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function AdminPaymentsPage() {
  let payments: {
    id: string;
    amount_cents: number;
    status: string;
    paid_at: string | null;
    created_at: string;
    learners: { first_name: string; last_name: string } | null;
  }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('payments')
      .select(
        'id, amount_cents, status, paid_at, created_at, learners(first_name, last_name)'
      )
      .order('created_at', { ascending: false })
      .limit(100);
    payments = (data ?? []) as typeof payments;
  }

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Payments</h1>
      <p className='mb-8 text-muted-foreground'>
        Recent payment records from subscriptions and applications.
      </p>
      <div className='space-y-3'>
        {payments.map((p) => {
          const learner = p.learners;
          return (
            <div
              key={p.id}
              className='flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white px-4 py-3 shadow-sm'
            >
              <div>
                <p className='font-medium'>
                  {learner
                    ? `${learner.first_name} ${learner.last_name}`
                    : 'Payment'}
                </p>
                <p className='text-sm text-muted-foreground'>
                  R{(p.amount_cents / 100).toFixed(2)} ·{' '}
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
