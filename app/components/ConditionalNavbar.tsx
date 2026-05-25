'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/app/components/navbar';
import { CTA } from '@/app/components/cta';

const HIDE_CHROME_PREFIXES = ['/dashboard', '/payment/return', '/login'];

function hideMarketingChrome(pathname: string): boolean {
  return HIDE_CHROME_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function ConditionalNavbar() {
  const pathname = usePathname();

  if (hideMarketingChrome(pathname)) {
    return null;
  }

  return (
    <>
      <Navbar />
      <CTA />
    </>
  );
}
