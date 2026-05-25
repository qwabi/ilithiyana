import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';

export const metadata: Metadata = noIndexMetadata;
import { cn } from '@/lib/utils';
import type React from 'react';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        jakarta.className,
        dmSerif.variable,
        'min-h-screen bg-white text-foreground'
      )}
    >
      {children}
    </div>
  );
}
