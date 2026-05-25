import { redirect } from 'next/navigation';

export default function LegacyLearnerReportsRedirect({
  params,
}: {
  params: { learner_id: string };
}) {
  redirect(`/dashboard/reports/${params.learner_id}`);
}
