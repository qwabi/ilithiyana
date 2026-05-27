import type { Metadata } from 'next';
import { brand } from '@/lib/site-config';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: `Enrol — ${brand.name}`,
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen bg-[hsl(210,40%,98%)]'>
      <main className='mx-auto max-w-3xl px-4 py-8 sm:py-12'>{children}</main>
    </div>
  );
}
