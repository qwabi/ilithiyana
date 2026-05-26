import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Legacy route — report entry is manual via the report builder only. */
export default async function ReportEntryRedirectPage({
  params,
}: {
  params: Promise<{ learner_id: string }>;
}) {
  const { learner_id } = await params;
  redirect(`/dashboard/reports/${learner_id}/add`);
}
