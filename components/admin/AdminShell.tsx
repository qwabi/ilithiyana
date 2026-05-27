'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { brand } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/** Ilithiyana brand tokens for admin chrome */
export const adminBrand = {
  primary: '#1B6CA8',
  accent: '#F5A623',
  dark: '#0F2942',
  surface: '#F8FAFC',
} as const;

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Applications', href: '/admin/dashboard/applications', icon: GraduationCap },
  { label: 'Prospective parents', href: '/admin/dashboard/leads', icon: UserPlus },
  { label: 'Subscriptions', href: '/admin/dashboard/subscriptions', icon: CreditCard },
  { label: 'Timesheets', href: '/admin/dashboard/timesheets', icon: Clock },
  { label: 'Classes', href: '/admin/dashboard/classes', icon: CalendarDays },
  {
    label: 'Contact messages',
    href: '/admin/dashboard/submissions/contact',
    icon: MessageSquare,
  },
] as const;

export type AdminShellUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export type AdminShellProps = {
  children: React.ReactNode;
  user?: AdminShellUser;
  onLogout?: () => void | Promise<void>;
  /** Optional header slot above page content */
  header?: React.ReactNode;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  children,
  user,
  onLogout,
  header,
}: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className='flex min-h-screen bg-[#F8FAFC]'>
      <aside
        className='sticky top-0 flex h-screen w-64 shrink-0 flex-col text-white'
        style={{ backgroundColor: adminBrand.dark }}
      >
        <div className='flex h-16 items-center gap-2 border-b border-white/10 px-5'>
          <div
            className='flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold'
            style={{ backgroundColor: adminBrand.primary }}
          >
            IA
          </div>
          <div className='min-w-0'>
            <p className='truncate font-display text-sm leading-tight'>
              {brand.name}
            </p>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-white/60'>
              Admin
            </p>
          </div>
        </div>

        {user ? (
          <div className='border-b border-white/10 px-5 py-4'>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-white/50'>
              Signed in
            </p>
            <p className='truncate text-sm font-semibold'>
              {user.name ?? user.email ?? 'Administrator'}
            </p>
            {user.email ? (
              <p className='truncate text-xs text-white/60'>{user.email}</p>
            ) : null}
          </div>
        ) : null}

        <nav className='flex-1 space-y-0.5 overflow-y-auto px-3 py-4'>
          {NAV_ITEMS.map((item) => {
            const active = isActive(
              pathname,
              item.href,
              'exact' in item ? item.exact : false,
            );
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon
                  size={18}
                  className={cn(active ? 'text-[#F5A623]' : 'text-white/50')}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className='border-t border-white/10 p-3'>
          <Button
            type='button'
            variant='ghost'
            className='w-full justify-start gap-2 text-white/80 hover:bg-white/10 hover:text-white'
            onClick={() => void onLogout?.()}
          >
            <LogOut className='h-4 w-4' />
            Log out
          </Button>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        {header ? (
          <header className='border-b border-border bg-white px-6 py-4'>
            {header}
          </header>
        ) : null}
        <main className='flex-1 p-6'>{children}</main>
      </div>
    </div>
  );
}
