import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLearnerForParentUser } from '@/lib/parent-learner-access';
import { ReportBuilderClient } from './ReportBuilderClient';

export const dynamic = 'force-dynamic';

export default async function AddReportManuallyPage({
  params,
}: {
  params: Promise<{ learner_id: string }>;
}) {
  const { learner_id } = await params;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?from=/dashboard/reports/${learner_id}/add`);
  }

  const access = await getLearnerForParentUser(user.id, learner_id);
  if (!access) {
    redirect('/dashboard/reports');
  }

  const { learner } = access;

  return (
    <div>
      <Link
        href={`/dashboard/reports/${learner_id}`}
        className='text-sm text-muted-foreground hover:underline'
      >
        ← Back to reports
      </Link>
      <ReportBuilderClient
        learnerId={learner.id}
        learnerName={`${learner.first_name} ${learner.last_name}`}
        grade={Number(learner.grade)}
      />
    </div>
  );
}
