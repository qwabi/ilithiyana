'use client';

import { useEffect, useState, useTransition } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { packages } from '@/lib/site-config';
import {
  loginParentPortal,
  logoutParentPortal,
} from '@/app/actions/portal-actions';
import { useRouter } from 'next/navigation';

type PortalData = NonNullable<
  Awaited<ReturnType<typeof import('@/app/actions/portal-actions').getParentPortalSession>>
>;

interface Props {
  initialData: PortalData | null;
}

const portalCard =
  'rounded-xl border-[0.5px] border-border bg-white shadow-sm';
const portalInput =
  'mt-1.5 h-11 rounded-lg border border-input bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0';
const cardTitle =
  '[font-family:var(--font-dm-serif),serif] text-xl font-normal tracking-tight';

function packageLabel(id: string) {
  return packages.find((p) => p.id === id)?.name ?? id;
}

function PortalStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const styles =
    key === 'approved' || key === 'active' || key === 'paid'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : key === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : key === 'rejected' || key === 'overdue'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-border bg-muted text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        styles
      )}
    >
      {status}
    </span>
  );
}

export function ParentPortal({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleLogin = () => {
    startTransition(async () => {
      const result = await loginParentPortal(email);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Signed in');
      router.refresh();
    });
  };

  const handleLogout = async () => {
    await logoutParentPortal();
    setData(null);
    router.refresh();
  };

  if (!data) {
    return (
      <Card className={portalCard}>
        <CardHeader>
          <CardTitle className={cardTitle}>Sign in with your email</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <Label htmlFor='parentEmail' className='text-sm font-medium'>
              Guardian email
            </Label>
            <Input
              id='parentEmail'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='you@example.com'
              className={portalInput}
            />
          </div>
          <Button
            onClick={handleLogin}
            disabled={isPending || !email}
            variant='secondary'
            className='h-11 w-full font-semibold'
          >
            {isPending ? 'Checking…' : 'View my records'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-sm text-muted-foreground'>
          Signed in as {data.parent.email}
        </p>
        <Button variant='ghost' size='sm' onClick={handleLogout}>
          Sign out
        </Button>
      </div>

      <Card className={portalCard}>
        <CardHeader>
          <CardTitle className={cardTitle}>Applications</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {data.applications.map((app) => (
            <div
              key={app.id}
              className='flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3 last:border-0 last:pb-0'
            >
              <div>
                <p className='font-medium text-foreground'>
                  {(app.learner_snapshot as { firstName?: string })?.firstName}{' '}
                  {(app.learner_snapshot as { lastName?: string })?.lastName}
                </p>
                <p className='text-sm text-muted-foreground'>
                  {packageLabel(app.package_id)} ·{' '}
                  {format(new Date(app.created_at), 'd MMM yyyy')}
                </p>
              </div>
              <PortalStatusBadge status={app.status} />
            </div>
          ))}
          {!data.applications.length && (
            <p className='text-sm text-muted-foreground'>No applications found.</p>
          )}
        </CardContent>
      </Card>

      <Card className={portalCard}>
        <CardHeader>
          <CardTitle className={cardTitle}>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {data.subscriptions.map((sub) => {
            const learner = sub.learners as {
              first_name: string;
              last_name: string;
            } | null;
            return (
              <div
                key={sub.id}
                className='flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3 last:border-0 last:pb-0'
              >
                <div>
                  <p className='font-medium text-foreground'>
                    {learner
                      ? `${learner.first_name} ${learner.last_name}`
                      : 'Learner'}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {packageLabel(sub.package_id)} — R
                    {(sub.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
                <PortalStatusBadge status={sub.status} />
              </div>
            );
          })}
          {!data.subscriptions.length && (
            <p className='text-sm text-muted-foreground'>
              No subscriptions yet. They appear after your application is approved.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className={portalCard}>
        <CardHeader>
          <CardTitle className={cardTitle}>Class schedule</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {data.classes.map((cls) => {
            const learner = cls.learners as {
              first_name: string;
              last_name: string;
            } | null;
            return (
              <div
                key={cls.id}
                className='border-b border-border/80 pb-3 last:border-0 last:pb-0'
              >
                <p className='font-medium text-foreground'>
                  {cls.subject} (Grade {cls.grade})
                </p>
                {learner && (
                  <p className='text-sm text-muted-foreground'>
                    {learner.first_name} {learner.last_name}
                  </p>
                )}
                {cls.schedule && (
                  <p className='text-sm text-foreground/90'>{cls.schedule}</p>
                )}
                {cls.meet_link && (
                  <a
                    href={cls.meet_link}
                    className='text-sm font-medium text-primary underline-offset-2 hover:underline'
                    target='_blank'
                    rel='noreferrer'
                  >
                    Join online class
                  </a>
                )}
              </div>
            );
          })}
          {!data.classes.length && (
            <p className='text-sm text-muted-foreground'>
              Your class schedule will appear here once classes are assigned.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
