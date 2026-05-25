import { LoginForm } from '@/app/components/auth/LoginForm';
import { brand } from '@/lib/site-config';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: ['400'] });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = pageMetadata({
  title: 'Parent login',
  description: `Sign in to your ${brand.name} parent dashboard.`,
  path: '/login',
  noIndex: true,
});

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; redirect?: string; lead?: string };
}) {
  const redirectTo =
    searchParams.redirect ?? searchParams.from ?? '/dashboard';
  const leadQuery = searchParams.lead ? `?lead=${searchParams.lead}` : '';
  const dashboardTarget =
    redirectTo === '/dashboard' && searchParams.lead
      ? `/dashboard${leadQuery}`
      : redirectTo;

  return (
    <div
      className={`container mx-auto max-w-md px-4 py-16 ${jakarta.className}`}
    >
      <h1
        className={`${dmSerif.className} text-3xl text-[hsl(210,100%,25%)]`}
      >
        Parent login
      </h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        Sign in with the email and password you chose when you applied.
      </p>
      <LoginForm redirectTo={dashboardTarget} />
    </div>
  );
}
