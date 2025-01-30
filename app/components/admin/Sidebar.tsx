'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { GraduationCap, Car, Building, MessageSquare } from 'lucide-react';

const menuItems = [
  {
    name: 'Logout',
    icon: GraduationCap,
    href: '/admin/login',
  },
  {
    name: 'Home',
    icon: GraduationCap,
    href: '/admin/dashboard',
  },
  {
    name: 'Academics',
    icon: GraduationCap,
    href: '/admin/dashboard/submissions/academics',
  },
  {
    name: 'Vehicle Care',
    icon: Car,
    href: '/admin/dashboard/submissions/vehicle-care',
  },
  {
    name: 'Infrastructure',
    icon: Building,
    href: '/admin/dashboard/submissions/infrastructure',
  },
  {
    name: 'Contact',
    icon: MessageSquare,
    href: '/admin/dashboard/submissions/contact',
  },
];

export function AdminSidebar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar open={open} onOpenChange={setOpen}>
        <SidebarHeader>
          <Button
            variant='ghost'
            className='w-full justify-start'
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className='sr-only'>Toggle Sidebar</span>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className={cn(
                'h-4 w-4 transition-transform',
                open ? 'rotate-180' : ''
              )}
            >
              <path d='m9 18 6-6-6-6' />
            </svg>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton asChild active={pathname === item.href}>
                  <Link href={item.href} className='flex items-center'>
                    <item.icon className='mr-2 h-4 w-4' />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
