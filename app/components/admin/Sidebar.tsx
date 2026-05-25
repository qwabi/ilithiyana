'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from '@/components/ui/sidebar';
import {
  GraduationCap,
  MessageSquare,
  CreditCard,
  Clock,
  LogOut,
  LayoutDashboard,
  CalendarDays,
  UserPlus,
} from 'lucide-react';
import { logoutAdmin } from '@/app/actions/admin-actions';

const menuItems = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
  },
  {
    name: 'Applications',
    icon: GraduationCap,
    href: '/admin/dashboard/applications',
  },
  {
    name: 'Prospective parents',
    icon: UserPlus,
    href: '/admin/dashboard/leads',
  },
  {
    name: 'Subscriptions',
    icon: CreditCard,
    href: '/admin/dashboard/subscriptions',
  },
  {
    name: 'Timesheets',
    icon: Clock,
    href: '/admin/dashboard/timesheets',
  },
  {
    name: 'Classes',
    icon: CalendarDays,
    href: '/admin/dashboard/classes',
  },
  {
    name: 'Contact messages',
    icon: MessageSquare,
    href: '/admin/dashboard/submissions/contact',
  },
];

export function AdminSidebar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAdmin();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <SidebarProvider>
      <Sidebar
        open={open}
        onOpenChange={setOpen}
        className='border-r border-[0.5px] border-border bg-[hsl(var(--light-blue)/0.1)]'
      >
        <SidebarHeader className='border-b border-[0.5px] border-border/80 px-4 py-4'>
          <div className='flex items-center justify-between gap-2'>
            <div className='min-w-0'>
              <p className='truncate text-xs font-semibold uppercase tracking-wider text-primary'>
                Ilithiyana
              </p>
              <p
                className={cn(
                  'truncate text-sm font-semibold text-foreground',
                  !open && 'sr-only'
                )}
              >
                Admin
              </p>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 shrink-0'
              onClick={() => setOpen((prev) => !prev)}
            >
              <span className='sr-only'>Toggle sidebar</span>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className={cn(
                  'transition-transform',
                  open ? 'rotate-180' : ''
                )}
              >
                <path d='m9 18 6-6-6-6' />
              </svg>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className='px-2 py-3'>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  active={
                    pathname === item.href ||
                    (item.href !== '/admin/dashboard' &&
                      pathname.startsWith(item.href))
                  }
                  className='text-sm font-medium data-[active=true]:bg-primary/10 data-[active=true]:text-primary'
                >
                  <Link href={item.href} className='flex items-center'>
                    <item.icon className='mr-2 h-4 w-4 shrink-0' />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem className='mt-4 border-t border-border/80 pt-3'>
              <SidebarMenuButton
                onClick={handleLogout}
                className='text-sm text-muted-foreground hover:text-foreground'
              >
                <LogOut className='mr-2 h-4 w-4' />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
