import type { Metadata } from 'next';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { noIndexMetadata } from '@/lib/seo';
import { brand } from '@/lib/site-config';

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: `Tutor portal — ${brand.name}`,
};

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

export default function TutorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        jakarta.className,
        dmSerif.variable,
        'min-h-screen bg-[hsl(210,40%,98%)] text-foreground'
      )}
    >
      {children}
    </div>
  );
}
