'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardSession } from '@/lib/parent-dashboard-types';
import { subscriptionDisplayStatus } from '@/lib/parent-dashboard-utils';
import { packages as sitePackages } from '@/lib/site-config';

const titleClass =
  '[font-family:var(--font-dm-serif),serif] text-xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

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

function packageName(id: string, pkgs: DashboardSession['packages']) {
  return (
    pkgs.find((p) => p.id === id)?.name ??
    sitePackages.find((p) => p.id === id)?.name ??
    id
  );
}

export function ParentDashboard({ data }: { data: DashboardSession }) {
  const firstName =
    data.profile?.full_name?.split(' ')[0] ?? data.parent.first_name;

  const hasOverdue = data.subscriptions.some((s) => s.status === 'overdue');

  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className={titleClass}>Welcome back, {firstName}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Manage children, reports, schedules, and billing from the menu.
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {data.subscriptions.slice(0, 3).map((sub) => (
              <span
                key={sub.id}
                className='inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs'
              >
                {packageName(sub.package_id, data.packages)}
                <StatusPill status={sub.status} />
              </span>
            ))}
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            asChild
            variant='outline'
            className='rounded-full'
          >
            <Link href='/dashboard/children'>My children</Link>
          </Button>
          <Button
            asChild
            className='rounded-full bg-accent text-[hsl(210,100%,12%)] hover:bg-accent/90'
          >
            <Link href='/dashboard/children/add'>Add a child</Link>
          </Button>
        </div>
      </div>

      {data.pendingReportConfirmations.length > 0 && (
        <div className='rounded-xl border border-[hsl(43,96%,56%)]/40 bg-[hsl(43,96%,96%)] px-4 py-4'>
          <p className='font-medium text-[hsl(210,100%,25%)]'>
            Confirm school report results
          </p>
          <ul className='mt-2 space-y-2 text-sm'>
            {data.pendingReportConfirmations.map((p) => (
              <li
                key={p.reportId}
                className='flex flex-wrap items-center justify-between gap-2'
              >
                <span>
                  {p.learnerName}
                  {p.ocrStatus === 'processing' || p.ocrStatus === 'pending'
                    ? ' — still reading report…'
                    : ' — ready to review'}
                </span>
                {(p.ocrStatus === 'complete' || p.ocrStatus === 'failed') && (
                  <Link
                    href={`/dashboard/reports/confirm/${p.reportId}`}
                    className='font-medium text-primary underline'
                  >
                    Review results
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <Link
            href='/dashboard/reports'
            className='mt-3 inline-block text-sm font-medium text-primary underline'
          >
            View all reports →
          </Link>
        </div>
      )}

      {hasOverdue && (
        <div className='rounded-xl border border-amber-300 bg-amber-50 px-4 py-4'>
          <p className='font-medium text-amber-900'>Subscription payment overdue</p>
          <p className='mt-1 text-sm text-amber-800'>
            Please complete your payment to keep classes active.
          </p>
          <div className='mt-3 flex flex-wrap gap-3'>
            <form action='/api/payfast/checkout' method='post'>
              <input
                type='hidden'
                name='subscriptionId'
                value={
                  data.subscriptions.find((s) => s.status === 'overdue')?.id ??
                  ''
                }
              />
              <Button
                type='submit'
                className='rounded-full bg-accent text-[hsl(210,100%,12%)] hover:bg-accent/90'
              >
                Pay now
              </Button>
            </form>
            <Button asChild variant='outline' className='rounded-full'>
              <Link href='/dashboard/subscriptions'>View subscriptions</Link>
            </Button>
          </div>
        </div>
      )}

      <section className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <QuickLink
          title='My children'
          description={`${data.learners.length} enrolled learner${data.learners.length !== 1 ? 's' : ''}`}
          href='/dashboard/children'
        />
        <QuickLink
          title='Schedules'
          description='Class timetable and join links'
          href='/dashboard/schedules'
        />
        <QuickLink
          title='Reports'
          description='Upload and confirm school reports'
          href='/dashboard/reports'
        />
        <QuickLink
          title='Subscriptions'
          description='Billing and payment history'
          href='/dashboard/subscriptions'
        />
      </section>

      {data.learners.length === 0 ? (
        <Card className='rounded-xl border border-border bg-white shadow-sm'>
          <CardContent className='py-10 text-center'>
            <p className='text-muted-foreground'>
              No learners added yet. Add your first child to get started.
            </p>
            <Button
              asChild
              className='mt-4 rounded-full bg-accent text-[hsl(210,100%,12%)] hover:bg-accent/90'
            >
              <Link href='/dashboard/children/add'>Add a child</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function QuickLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className='block rounded-xl border border-border bg-white p-5 shadow-sm
                 transition-colors hover:border-primary/30 hover:bg-[hsl(210,100%,98%)]'
    >
      <p className='font-medium text-foreground'>{title}</p>
      <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
    </Link>
  );
}
