import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata;

/** Legacy return URL — parents go to dashboard sign-in instead of email verification. */
export default function WelcomePage() {
  redirect('/login?from=/dashboard');
}
