import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { contact } from '@/lib/site-config';
import { packageDisplayLabel } from '@/lib/payment-return-labels';
import type { PaymentReturnView } from '@/lib/payfast-return-urls';
import type { PaymentFulfillmentView } from '@/app/payment/return/page';
import { PaymentReturnAutoSignIn } from '@/app/components/payment/PaymentReturnAutoSignIn';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';

const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: ['400'] });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500'] });

type Props = {
  view: PaymentReturnView;
  dashboardHref: string;
  fulfillment: PaymentFulfillmentView;
  isLoggedIn: boolean;
  autoSignIn?: boolean;
};

export function PaymentReturnCard({
  view,
  dashboardHref,
  fulfillment,
  isLoggedIn,
  autoSignIn = false,
}: Props) {
  return (
    <div
      className={`mx-auto flex min-h-[60vh] max-w-[480px] items-center justify-center px-4 py-16 ${jakarta.className}`}
    >
      {autoSignIn && (
        <PaymentReturnAutoSignIn enabled redirectTo={dashboardHref} />
      )}
      <div className='w-full rounded-2xl border border-[hsl(214,32%,91%)] bg-white p-8 shadow-sm'>
        {view.kind === 'success' && (
          <SuccessContent
            view={view}
            dashboardHref={dashboardHref}
            fulfillment={fulfillment}
            isLoggedIn={isLoggedIn}
            autoSignIn={autoSignIn}
          />
        )}
        {view.kind === 'cancelled' && <CancelledContent view={view} />}
        {view.kind === 'error' && <ErrorContent />}
      </div>
    </div>
  );
}

function SuccessContent({
  view,
  dashboardHref,
  fulfillment,
  isLoggedIn,
  autoSignIn,
}: {
  view: Extract<PaymentReturnView, { kind: 'success' }>;
  dashboardHref: string;
  fulfillment: PaymentFulfillmentView;
  isLoggedIn: boolean;
  autoSignIn: boolean;
}) {
  const packageLabel = packageDisplayLabel(view.packageId);
  const fulfillError = fulfillment.state === 'error';
  const fulfillOk =
    fulfillment.state === 'success' &&
    (fulfillment.alreadyPaid || Boolean(fulfillment.applicationId));
  const alreadyPaid =
    fulfillment.state === 'success' && fulfillment.alreadyPaid;

  return (
    <>
      {fulfillError ? (
        <AlertTriangle
          className='mx-auto h-14 w-14 text-[hsl(38,92%,50%)]'
          aria-hidden
        />
      ) : (
        <CheckCircle2
          className='mx-auto h-14 w-14 text-[hsl(142,76%,36%)]'
          aria-hidden
        />
      )}
      <h1
        className={`${dmSerif.className} mt-6 text-center text-[26px] text-[hsl(210,100%,25%)]`}
      >
        {fulfillError
          ? 'Payment received — setup pending'
          : alreadyPaid
            ? 'Already enrolled'
            : 'Payment received'}
      </h1>
      {fulfillError ? (
        <p className='mt-4 text-center text-sm leading-relaxed text-destructive'>
          {fulfillment.message}
        </p>
      ) : (
        <p className='mt-4 text-center text-sm leading-relaxed text-muted-foreground'>
          Thank you! We&apos;ve received your payment for{' '}
          <span className='font-medium text-foreground'>{view.learnerName}</span>
          {alreadyPaid
            ? '. Your enrolment is already active.'
            : '. Your application is now active and your dashboard is ready.'}
        </p>
      )}
      <dl className='mt-6 space-y-2 text-center text-xs text-muted-foreground'>
        <div>
          <dt className='sr-only'>Reference</dt>
          <dd>
            Reference:{' '}
            <span className='font-mono text-foreground'>{view.ref}</span>
          </dd>
        </div>
        <div>
          <dt className='sr-only'>Package</dt>
          <dd>Package: {packageLabel}</dd>
        </div>
      </dl>
      {fulfillOk && (
        <div className='mt-8'>
          {autoSignIn && !isLoggedIn ? (
            <div className='flex flex-col items-center gap-3'>
              <Loader2
                className='h-6 w-6 animate-spin text-primary'
                aria-hidden
              />
              <p className='text-center text-sm text-muted-foreground'>
                Signing you in…
              </p>
              <Button asChild variant='ghost' className='w-full rounded-full' size='lg'>
                <Link href={dashboardHref}>Continue to dashboard →</Link>
              </Button>
            </div>
          ) : (
            <Button asChild className='w-full rounded-full' size='lg'>
              <Link href={dashboardHref}>Go to my dashboard →</Link>
            </Button>
          )}
        </div>
      )}
      {fulfillError && (
        <div className='mt-8 flex flex-col gap-3'>
          <Button asChild variant='secondary' className='w-full rounded-full' size='lg'>
            <Link href='/login?redirect=/dashboard'>Sign in to dashboard</Link>
          </Button>
          <Button asChild variant='ghost' className='w-full rounded-full' size='lg'>
            <Link href='/contact'>Contact support</Link>
          </Button>
        </div>
      )}
      <p className='mt-6 text-center text-xs text-muted-foreground'>
        Questions? Email{' '}
        <a
          href={`mailto:${contact.email}`}
          className='text-primary underline-offset-2 hover:underline'
        >
          {contact.email}
        </a>
      </p>
    </>
  );
}

function CancelledContent({
  view,
}: {
  view: Extract<PaymentReturnView, { kind: 'cancelled' }>;
}) {
  const tryAgainHref =
    view.redirect ??
    (view.flow === 'dashboard'
      ? '/dashboard/children/add'
      : `/apply-now?resume=${encodeURIComponent(view.applicationId)}`);

  return (
    <>
      <AlertTriangle
        className='mx-auto h-14 w-14 text-[hsl(38,92%,50%)]'
        aria-hidden
      />
      <h1
        className={`${dmSerif.className} mt-6 text-center text-[26px] text-[hsl(210,100%,25%)]`}
      >
        Payment not completed
      </h1>
      <p className='mt-4 text-center text-sm leading-relaxed text-muted-foreground'>
        Your application for{' '}
        <span className='font-medium text-foreground'>{view.learnerName}</span>{' '}
        has been saved, but payment was not completed. No money has been taken
        from your account.
      </p>
      <p className='mt-4 text-center text-xs text-muted-foreground'>
        Reference:{' '}
        <span className='font-mono text-foreground'>{view.ref}</span>
      </p>
      <div className='mt-8 flex flex-col gap-3'>
        <Button asChild variant='secondary' className='w-full rounded-full' size='lg'>
          <Link href={tryAgainHref}>Try payment again →</Link>
        </Button>
        <Button asChild variant='ghost' className='w-full rounded-full' size='lg'>
          <Link href='/apply-now'>Back to application</Link>
        </Button>
      </div>
      <p className='mt-6 text-center text-xs text-muted-foreground'>
        Need help?{' '}
        <a href={`tel:${contact.phoneTel}`} className='text-primary hover:underline'>
          {contact.phone}
        </a>
      </p>
    </>
  );
}

function ErrorContent() {
  return (
    <>
      <XCircle
        className='mx-auto h-14 w-14 text-destructive'
        aria-hidden
      />
      <h1
        className={`${dmSerif.className} mt-6 text-center text-[26px] text-[hsl(210,100%,25%)]`}
      >
        Something went wrong
      </h1>
      <p className='mt-4 text-center text-sm leading-relaxed text-muted-foreground'>
        We couldn&apos;t confirm your payment status. Please don&apos;t worry —
        if you completed payment, your money is safe and we will follow up.
      </p>
      <p className='mt-4 text-center text-sm text-muted-foreground'>
        Please contact us directly:
        <br />
        <a
          href={`mailto:${contact.email}`}
          className='text-primary underline-offset-2 hover:underline'
        >
          {contact.email}
        </a>
        <br />
        <a href={`tel:${contact.phoneTel}`} className='text-primary hover:underline'>
          {contact.phone}
        </a>
      </p>
      <div className='mt-8'>
        <Button asChild variant='ghost' className='w-full rounded-full' size='lg'>
          <Link href='/'>Back to home</Link>
        </Button>
      </div>
    </>
  );
}
