'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { showsMarketingNavbar } from '@/lib/app-shell-routes';

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const withNavOffset = showsMarketingNavbar(pathname);

  return (
    <main
      className={cn('w-full flex-1 px-2 md:px-0', withNavOffset && 'pt-16')}
    >
      {children}
    </main>
  );
}
