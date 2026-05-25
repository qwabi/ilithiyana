import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { LearnerReportsPanel } from '@/app/components/dashboard/LearnerReportsPanel';
import { PageHeader } from '@/app/components/dashboard/PageHeader';

export const dynamic = 'force-dynamic';

export default async function LearnerReportsPage({
  params,
}: {
  params: { learner_id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?from=/dashboard/reports/${params.learner_id}`);
  }

  const { data: learner } = await supabase
    .from('learners')
    .select('id, first_name, last_name, grade, parents ( profile_id )')
    .eq('id', params.learner_id)
    .single();

  if (!learner) {
    return <p className='text-muted-foreground'>Learner not found.</p>;
  }

  const parent = learner.parents as { profile_id: string | null } | null;
  if (parent?.profile_id !== user.id) {
    redirect('/dashboard/reports');
  }

  const { data: reports } = await supabase
    .from('learner_reports')
    .select('id, term, academic_year, uploaded_at, ocr_status, confirmed')
    .eq('learner_id', params.learner_id)
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
        description={`Grade ${learner.grade}. Upload a new report at the end of each term.`}
        action={{
          label: 'Add report',
          href: `/dashboard/reports/${params.learner_id}/upload`,
          variant: 'gold',
        }}
      />
      <LearnerReportsPanel
        learnerId={params.learner_id}
        learnerName={learnerName}
        reports={(reports ?? []).map((r) => ({
          id: r.id,
          term: r.term,
          academic_year: r.academic_year,
          uploaded_at: r.uploaded_at,
          ocr_status: r.ocr_status,
          confirmed: r.confirmed,
        }))}
      />
    </div>
  );
}
