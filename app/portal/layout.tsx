import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
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

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        jakarta.className,
        dmSerif.variable,
        'min-h-[60vh] bg-white text-foreground'
      )}
    >
      {children}
    </div>
  );
}
