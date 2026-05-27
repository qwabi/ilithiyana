import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLearnerForParentUser } from '@/lib/parent-learner-access';
import { LearnerReportsPanel } from '@/app/components/dashboard/LearnerReportsPanel';
import { PageHeader } from '@/app/components/dashboard/PageHeader';

export const dynamic = 'force-dynamic';

export default async function LearnerReportsPage({
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
    redirect(`/login?from=/dashboard/reports/${learner_id}`);
  }

  const access = await getLearnerForParentUser(user.id, learner_id);
  if (!access) {
    redirect('/dashboard/reports');
  }

  const { learner } = access;

  const { data: reports } = await supabase
    .from('learner_reports')
    .select('id, term, academic_year, uploaded_at, confirmed')
    .eq('learner_id', learner_id)
    .order('uploaded_at', { ascending: false });

  const learnerName = `${learner.first_name} ${learner.last_name}`;

  return (
    <div>
      <Link
        href='/dashboard/reports'
        className='text-sm text-muted-foreground hover:underline'
      >
        ← All reports
      </Link>
      <PageHeader
        title={`Reports — ${learnerName}`}
        description={`Grade ${learner.grade}. Enter a new report at the end of each term.`}
        action={{
          label: 'Add report',
          href: `/dashboard/reports/${learner_id}/add`,
          variant: 'gold',
        }}
      />
      <LearnerReportsPanel
        learnerId={learner_id}
        learnerName={learnerName}
        reports={(reports ?? []).map((r) => ({
          id: r.id,
          term: r.term,
          academic_year: r.academic_year,
          uploaded_at: r.uploaded_at,
          confirmed: r.confirmed,
        }))}
      />
    </div>
  );
}
