import { redirect } from 'next/navigation';
import { ChildCard } from '@/app/components/dashboard/ChildCard';
import { EmptyState } from '@/app/components/dashboard/EmptyState';
import { PageHeader } from '@/app/components/dashboard/PageHeader';
import {
  getParentChildrenPage,
  resolveParentContext,
} from '@/lib/parent-dashboard-sections';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ChildrenPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?from=/dashboard/children');

  const ctx = await resolveParentContext(user.id);
  if (!ctx) {
    redirect('/dashboard');
  }

  const learners = await getParentChildrenPage(ctx);

  return (
    <div>
      <PageHeader
        title='My Children'
        description='Manage your enrolled learners and their subscriptions.'
        action={{
          label: 'Add a child',
          href: '/dashboard/children/add',
          variant: 'gold',
        }}
      />

      {learners.length === 0 ? (
        <EmptyState
          icon='users'
          title='No children enrolled yet'
          description='Add your first child to get started with tutoring.'
          action={{
            label: 'Add a child',
            href: '/dashboard/children/add',
          }}
        />
      ) : (
        <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
          {learners.map((learner) => (
            <ChildCard key={learner.id} learner={learner} />
          ))}
        </div>
      )}
    </div>
  );
}
