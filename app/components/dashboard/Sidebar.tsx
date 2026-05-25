'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Calendar,
  FileText,
  CreditCard,
  LayoutDashboard,
  GraduationCap,
} from 'lucide-react';
import { signOut } from '@/app/actions/auth-actions';
import { brand } from '@/lib/site-config';

const NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'My Children',
    href: '/dashboard/children',
    icon: Users,
    highlightOnOverview: true,
  },
  {
    label: 'Schedules',
    href: '/dashboard/schedules',
    icon: Calendar,
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: FileText,
  },
  {
    label: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: CreditCard,
  },
] as const;

export type SidebarProfile = {
  fullName: string | null;
  email: string | null;
};

function isNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
  highlightOnOverview?: boolean
) {
  if (exact) return pathname === href;
  if (highlightOnOverview && pathname === '/dashboard') return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ profile }: { profile: SidebarProfile }) {
  const pathname = usePathname();

  return (
    <aside
      className='sticky top-0 flex h-screen w-64 shrink-0 flex-col
                 border-r border-border bg-white'
    >
      <div className='flex h-16 items-center border-b border-border px-6'>
        <GraduationCap className='mr-2 text-[hsl(210,100%,35%)]' size={22} />
        <span className='[font-family:var(--font-dm-serif),serif] text-lg text-[hsl(210,100%,25%)]'>
          {brand.name}
        </span>
      </div>

      <div className='border-b border-border px-6 py-4'>
        <p className='mb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Signed in as
        </p>
        <p className='truncate text-sm font-semibold text-foreground'>
          {profile.fullName ?? profile.email ?? 'Parent'}
        </p>
        {profile.email ? (
          <p className='truncate text-xs text-muted-foreground'>
            {profile.email}
          </p>
        ) : null}
      </div>

      <nav className='flex-1 space-y-1 px-3 py-4'>
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(
            pathname,
            item.href,
            'exact' in item ? item.exact : false,
            'highlightOnOverview' in item ? item.highlightOnOverview : false
          );
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[hsl(210,100%,96%)] text-[hsl(210,100%,35%)]'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon
                size={18}
                className={
                  active ? 'text-[hsl(210,100%,40%)]' : 'text-muted-foreground'
                }
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className='border-t border-border px-3 py-4'>
        <form action={signOut}>
          <button
            type='submit'
            className='w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium
                       text-muted-foreground transition-colors hover:bg-muted/50
                       hover:text-foreground'
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
