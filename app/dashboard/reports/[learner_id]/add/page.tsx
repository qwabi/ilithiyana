import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ReportBuilderClient } from './ReportBuilderClient';

export const dynamic = 'force-dynamic';

export default async function AddReportManuallyPage({
  params,
}: {
  params: { learner_id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?from=/dashboard/reports/${params.learner_id}/add`);
  }

  const { data: learner } = await supabase
    .from('learners')
    .select('id, first_name, last_name, grade, parents ( profile_id )')
    .eq('id', params.learner_id)
    .single();

  if (!learner) {
    redirect('/dashboard/children');
  }

  const parent = learner.parents as { profile_id: string | null } | null;
  if (parent?.profile_id !== user.id) {
    redirect('/dashboard/reports');
  }

  return (
    <div>
      <Link
        href={`/dashboard/reports/${params.learner_id}/upload`}
        className='text-sm text-muted-foreground hover:underline'
      >
        ← Back to entry options
      </Link>
      <ReportBuilderClient
        learnerId={learner.id}
        learnerName={`${learner.first_name} ${learner.last_name}`}
        grade={Number(learner.grade)}
      />
    </div>
  );
}
