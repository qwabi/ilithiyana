'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Clock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
} from 'lucide-react';
import { brand } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const tutorBrand = {
  primary: '#1B6CA8',
  accent: '#F5A623',
  dark: '#0F2942',
  surface: '#F8FAFC',
} as const;

const NAV_ITEMS = [
  { label: 'Overview', href: '/tutor', icon: LayoutDashboard, exact: true },
  { label: 'My classes', href: '/tutor/classes', icon: Users },
  { label: 'Schedule', href: '/tutor/schedule', icon: Calendar },
  { label: 'Timesheets', href: '/tutor/timesheets', icon: Clock },
] as const;

export type TutorShellUser = {
  name?: string | null;
  email?: string | null;
};

export type TutorShellProps = {
  children: React.ReactNode;
  user?: TutorShellUser;
  onLogout?: () => void | Promise<void>;
  header?: React.ReactNode;
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TutorShell({
  children,
  user,
  onLogout,
  header,
}: TutorShellProps) {
  const pathname = usePathname();

  return (
    <div className='flex min-h-screen bg-[#F8FAFC]'>
      <aside className='sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-white'>
        <div className='flex h-16 items-center gap-2 border-b border-border px-5'>
          <GraduationCap className='text-[#1B6CA8]' size={22} />
          <div className='min-w-0'>
            <p className='truncate font-display text-sm text-[#0F2942]'>
              {brand.name}
            </p>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Tutor portal
            </p>
          </div>
        </div>

        {user ? (
          <div className='border-b border-border px-5 py-4'>
            <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Signed in
            </p>
            <p className='truncate text-sm font-semibold text-foreground'>
              {user.name ?? user.email ?? 'Tutor'}
            </p>
            {user.email ? (
              <p className='truncate text-xs text-muted-foreground'>
                {user.email}
              </p>
            ) : null}
          </div>
        ) : null}

        <nav className='flex-1 space-y-0.5 px-3 py-4'>
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
                    ? 'bg-[#1B6CA8]/10 text-[#1B6CA8]'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    active ? 'text-[#1B6CA8]' : 'text-muted-foreground',
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className='mt-auto border-t border-border p-3'>
          <Button
            type='button'
            variant='outline'
            className='w-full justify-start gap-2'
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
