'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Clock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { tutorSignOut } from '@/lib/tutor/actions';

const navItems = [
  { name: 'Dashboard', href: '/tutor/dashboard', icon: LayoutDashboard },
  { name: 'Schedule', href: '/tutor/schedule', icon: CalendarDays },
  { name: 'Timesheets', href: '/tutor/timesheets', icon: Clock },
  { name: 'Profile', href: '/tutor/profile', icon: User },
] as const;

export function TutorShell({
  children,
  tutorName,
}: {
  children: React.ReactNode;
  tutorName: string;
}) {
  const pathname = usePathname();

  return (
    <div className='flex min-h-screen bg-[#F8FAFC]'>
      <aside className='hidden w-56 shrink-0 border-r border-border bg-white md:flex md:flex-col'>
        <div className='border-b border-border px-4 py-5'>
          <Link
            href='/tutor/dashboard'
            className='flex items-center gap-2 text-[#0F2942]'
          >
            <GraduationCap className='h-5 w-5 text-[#1B6CA8]' />
            <span className='[font-family:var(--font-dm-serif),serif] text-lg'>
              Tutor portal
            </span>
          </Link>
          <p className='mt-2 truncate text-xs text-muted-foreground'>{tutorName}</p>
        </div>
        <nav className='flex flex-1 flex-col gap-1 p-3'>
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/tutor/dashboard' &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#1B6CA8]/10 text-[#1B6CA8]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className='h-4 w-4 shrink-0' />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className='border-t border-border p-3'>
          <form action={tutorSignOut}>
            <Button
              type='submit'
              variant='ghost'
              size='sm'
              className='w-full justify-start text-muted-foreground'
            >
              <LogOut className='mr-2 h-4 w-4' />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex items-center justify-between border-b border-border bg-white px-4 py-3 md:hidden'>
          <span className='text-sm font-medium text-foreground'>{tutorName}</span>
          <form action={tutorSignOut}>
            <Button type='submit' variant='ghost' size='sm'>
              Sign out
            </Button>
          </form>
        </header>
        <nav className='flex gap-1 overflow-x-auto border-b border-border bg-white px-2 py-2 md:hidden'>
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/tutor/dashboard' &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  active
                    ? 'bg-[#1B6CA8] text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
        <main className='flex-1 p-6 lg:p-8'>{children}</main>
      </div>
    </div>
  );
}
