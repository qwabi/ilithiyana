'use client';

import Link from 'next/link';
import { contact } from '@/lib/site-config';
import { Button } from '@/components/ui/button';

export function DashboardPendingActivation({
  email,
  reason = 'no_parent',
  message,
}: {
  email?: string | null;
  reason?: 'no_parent' | 'wrong_role' | 'error';
  message?: string;
}) {
  const title =
    reason === 'wrong_role'
      ? 'Not a parent account'
      : reason === 'error'
        ? 'Could not load profile'
        : 'Setting up your account';

  const body =
    reason === 'wrong_role' ? (
      <>
        {email ? (
          <>
            Signed in as <strong>{email}</strong>. Your account was found but is
            not set up as a parent account.
          </>
        ) : (
          <>Your account was found but is not set up as a parent account.</>
        )}{' '}
        Please contact{' '}
        <a
          href={`mailto:${contact.email}`}
          className='text-primary underline-offset-2 hover:underline'
        >
          {contact.email}
        </a>{' '}
        for help.
      </>
    ) : reason === 'error' ? (
      <>
        Something went wrong loading your profile. Please try again.
        {message ? (
          <span className='mt-2 block font-mono text-xs text-muted-foreground'>
            {message}
          </span>
        ) : null}
      </>
    ) : (
      <>
        {email ? (
          <>
            Signed in as <strong>{email}</strong>.
          </>
        ) : null}{' '}
        We&apos;re still setting up your account. This can take a moment after
        your first sign-in. Please refresh the page or contact us if this
        persists.
      </>
    );

  return (
    <div className='mx-auto max-w-lg rounded-xl border bg-white px-6 py-10 text-center'>
      <h2 className='text-xl font-medium text-[hsl(210,100%,25%)]'>{title}</h2>
      <p className='mt-3 text-sm leading-relaxed text-muted-foreground'>
        {body}
      </p>
      <div className='mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center'>
        {reason !== 'wrong_role' && (
          <Button
            type='button'
            variant='secondary'
            className='rounded-full'
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        )}
        <Button asChild variant='outline' className='rounded-full'>
          <a href={`mailto:${contact.email}`}>Contact us</a>
        </Button>
      </div>
      {reason === 'no_parent' && (
        <p className='mt-6 text-xs text-muted-foreground'>
          Paid but still stuck?{' '}
          <Link href='/payment/return' className='text-primary underline'>
            Return from payment
          </Link>{' '}
          or WhatsApp{' '}
          <a href={contact.whatsapp} className='text-primary underline'>
            {contact.phone}
          </a>
        </p>
      )}
    </div>
  );
}
