'use client';

import { usePathname } from 'next/navigation';
import { AppFlowHeader } from '@/app/components/auth/AppFlowHeader';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { Navbar } from '@/app/components/navbar';
import {
  APP_FLOW_HEADER_PREFIXES,
  HIDE_MARKETING_NAV_PREFIXES,
  matchesPrefix,
} from '@/lib/app-shell-routes';

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
