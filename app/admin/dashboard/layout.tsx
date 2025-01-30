import { AdminSidebar } from '@/app/components/admin/Sidebar';
import type React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex h-screen pt-4'>
      <AdminSidebar />
      <main className='flex-1 overflow-y-auto p-8'>{children}</main>
    </div>
  );
}
