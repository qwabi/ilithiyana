'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { packages } from '@/lib/site-config';
import type {
  SubscriptionStatus,
  SubscriptionWithLearner,
} from '@/lib/types/database';
import {
  fetchSubscriptions,
  setSubscriptionStatus,
} from '@/app/actions/admin-actions';

const ALL = '__all__';

function packageLabel(id: string) {
  return packages.find((p) => p.id === id)?.name ?? id;
}

function statusVariant(status: SubscriptionStatus) {
  switch (status) {
    case 'paid':
      return 'default';
    case 'overdue':
      return 'destructive';
    case 'cancelled':
      return 'secondary';
    default:
      return 'outline';
  }
}

interface Props {
  initialRows: SubscriptionWithLearner[];
  initialError?: string;
}

export function SubscriptionsTable({ initialRows, initialError }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState(initialError ?? null);
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | typeof ALL>(
    ALL
  );
  const [isPending, startTransition] = useTransition();

  const refresh = (status?: SubscriptionStatus) => {
    startTransition(async () => {
      const result = await fetchSubscriptions(
        status ? { status } : undefined
      );
      setRows(result.data);
      setError(result.error ?? null);
    });
  };

  const handleStatusChange = async (
    id: string,
    status: SubscriptionStatus
  ) => {
    const result = await setSubscriptionStatus(id, status);
    if (!result.ok) {
      toast.error(result.error ?? 'Update failed');
      return;
    }
    toast.success('Subscription updated');
    refresh(statusFilter === ALL ? undefined : statusFilter);
  };

  const startPayfastCheckout = async (row: SubscriptionWithLearner) => {
    const learner = row.learners;
    if (!learner) {
      toast.error('Learner record missing');
      return;
    }

    const res = await fetch('/api/payfast/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId: row.id,
        email: 'info@ilithiyana.co.za',
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Checkout failed');
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = json.processUrl;
    Object.entries(json.fields as Record<string, string>).forEach(([k, v]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-3 items-center'>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            const next = v as SubscriptionStatus | typeof ALL;
            setStatusFilter(next);
            refresh(next === ALL ? undefined : next);
          }}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='Filter status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='paid'>Paid</SelectItem>
            <SelectItem value='overdue'>Overdue</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {isPending && (
          <span className='text-sm text-muted-foreground'>Loading…</span>
        )}
      </div>

      {error && (
        <p className='text-sm text-destructive'>{error}</p>
      )}

      <div className='grid gap-4'>
        {rows.map((row) => {
          const learner = row.learners;
          const name = learner
            ? `${learner.first_name} ${learner.last_name}`
            : 'Unknown learner';

          return (
            <Card key={row.id}>
              <CardHeader className='pb-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <CardTitle className='text-lg'>{name}</CardTitle>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <p>
                  <span className='text-muted-foreground'>Package:</span>{' '}
                  {packageLabel(row.package_id)} — R
                  {(row.amount_cents / 100).toFixed(2)}
                </p>
                {row.period_end && (
                  <p>
                    <span className='text-muted-foreground'>Period end:</span>{' '}
                    {format(new Date(row.period_end), 'd MMM yyyy')}
                  </p>
                )}
                <div className='flex flex-wrap gap-2 pt-2'>
                  {row.status !== 'paid' && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => startPayfastCheckout(row)}
                    >
                      PayFast checkout
                    </Button>
                  )}
                  {row.status !== 'paid' && (
                    <Button
                      size='sm'
                      onClick={() => handleStatusChange(row.id, 'paid')}
                    >
                      Mark paid
                    </Button>
                  )}
                  {row.status !== 'overdue' && row.status !== 'paid' && (
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() => handleStatusChange(row.id, 'overdue')}
                    >
                      Mark overdue
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!rows.length && !error && (
          <p className='text-muted-foreground'>No subscriptions yet.</p>
        )}
      </div>
    </div>
  );
}
