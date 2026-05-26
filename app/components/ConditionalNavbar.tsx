'use client';

import { usePathname } from 'next/navigation';
import { AppFlowHeader } from '@/app/components/auth/AppFlowHeader';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { Navbar } from '@/app/components/navbar';

const HIDE_MARKETING_NAV_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/payment/return',
  '/login',
  '/tutor',
  '/admin',
];

const APP_FLOW_HEADER_PREFIXES = ['/onboarding', '/payment/return'];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function ConditionalNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (matchesPrefix(pathname, HIDE_MARKETING_NAV_PREFIXES)) {
    if (
      user &&
      matchesPrefix(pathname, APP_FLOW_HEADER_PREFIXES)
    ) {
      return <AppFlowHeader />;
    }
    return null;
  }

  return <Navbar />;
}
