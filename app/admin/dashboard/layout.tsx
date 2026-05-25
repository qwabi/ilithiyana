import { AdminSidebar } from '@/app/components/admin/Sidebar';
import type React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex min-h-screen bg-white pt-0'>
      <AdminSidebar />
      <main className='flex-1 overflow-y-auto bg-white p-6 md:p-8 lg:p-10'>
        {children}
      </main>
    </div>
  );
}
