import { format } from 'date-fns';
import { formatCents, subscriptionDisplayStatus } from '@/lib/parent-dashboard-utils';
import { cn } from '@/lib/utils';
import type { SubscriptionsPageData } from '@/lib/parent-dashboard-sections';

function StatusPill({ status }: { status: string }) {
  const key = subscriptionDisplayStatus(status);
  const styles =
    key === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : key === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : key === 'overdue'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-border bg-muted text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        styles
      )}
    >
      {key}
    </span>
  );
}

type Sub = SubscriptionsPageData['subscriptions'][number];

export function SubscriptionCard({ subscription }: { subscription: Sub }) {
  const pkg = subscription.package;
  const learner = subscription.learner;

  return (
    <div className='rounded-xl border border-border bg-white shadow-sm'>
      <div className='space-y-2 p-6'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='font-medium text-foreground'>
            {pkg?.name ?? subscription.package_id}
          </p>
          <StatusPill status={subscription.status} />
        </div>
        {pkg?.description ? (
          <p className='text-sm text-muted-foreground'>{pkg.description}</p>
        ) : null}
        <p className='text-sm text-foreground'>
          {formatCents(subscription.amount_cents)}
          {pkg?.billing_type === 'recurring' ? ' / month' : ' / lesson'}
          {learner
            ? ` · ${learner.first_name} ${learner.last_name}`
            : ''}
        </p>
        {subscription.next_billing_date ? (
          <p className='text-sm text-muted-foreground'>
            Next payment due:{' '}
            {format(new Date(subscription.next_billing_date), 'd MMM yyyy')}
          </p>
        ) : null}
        {subscription.status === 'overdue' ? (
          <form action='/api/payfast/checkout' method='post' className='pt-2'>
            <input
              type='hidden'
              name='subscriptionId'
              value={subscription.id}
            />
            <button
              type='submit'
              className='rounded-full bg-accent px-4 py-2 text-sm font-bold
                         text-[hsl(210,100%,12%)] hover:bg-accent/90'
            >
              Pay now
            </button>
          </form>
        ) : null}
      </div>

      {subscription.payments.length > 0 ? (
        <div className='border-t border-border px-6 py-4'>
          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Payment history
          </p>
          <ul className='space-y-2 text-sm'>
            {subscription.payments.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className='flex flex-wrap items-center justify-between gap-2'
              >
                <span className='text-muted-foreground'>
                  {format(
                    new Date(p.paid_at ?? p.created_at),
                    'd MMM yyyy'
                  )}{' '}
                  · {formatCents(p.amount_cents)} · {p.status}
                </span>
                {p.status === 'complete' ? (
                  <a
                    href={`/api/receipts/${p.id}`}
                    className='text-primary underline'
                  >
                    Receipt
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
