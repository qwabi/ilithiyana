import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { DashboardTopBar } from '@/app/components/dashboard/DashboardTopBar';
import { OnboardingResumeBanner } from '@/app/components/dashboard/OnboardingResumeBanner';
import { Sidebar } from '@/app/components/dashboard/Sidebar';
import { loadDashboardShellProfile } from '@/lib/parent-dashboard-sections';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { noIndexMetadata } from '@/lib/seo';
import { Plus_Jakarta_Sans } from 'next/font/google';

export const metadata: Metadata = noIndexMetadata;

export const dynamic = 'force-dynamic';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500'] });

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?from=/dashboard');
  }

  const shellProfile = await loadDashboardShellProfile(user.id);

  const profile = shellProfile ?? {
    fullName: user.user_metadata?.full_name ?? null,
    email: user.email ?? null,
  };

  return (
    <div
      className={`flex min-h-screen bg-[hsl(210,40%,98%)] ${jakarta.className}`}
    >
      <Sidebar profile={profile} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <DashboardTopBar />
        <main className='flex-1 p-6 lg:p-8'>
          <OnboardingResumeBanner userId={user.id} email={user.email} />
          {children}
        </main>
      </div>
    </div>
  );
}
