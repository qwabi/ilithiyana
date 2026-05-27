import { LogoutButton } from '@/app/components/auth/LogoutButton';

export function DashboardTopBar() {
  return (
    <header
      className='sticky top-0 z-10 flex h-14 shrink-0 items-center justify-end
                 border-b border-border bg-white px-6 lg:px-8'
    >
      <LogoutButton />
    </header>
  );
}
