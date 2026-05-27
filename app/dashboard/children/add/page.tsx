import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AddChildWizard } from '@/app/components/dashboard/AddChildWizard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AddChildPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?from=/dashboard/children/add');

  return (
    <div>
      <Link
        href='/dashboard/children'
        className='text-sm text-primary underline'
      >
        ← Back to my children
      </Link>
      <h1 className='mt-4 [font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)]'>
        Add a child
      </h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        Select a package, enter learner details, and add their latest school report marks
        marks (or upload a file), then complete payment. Each child requires
        their own subscription.
      </p>
      <div className='mt-8 max-w-xl'>
        <AddChildWizard />
      </div>
    </div>
  );
}
