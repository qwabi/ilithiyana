import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Legacy route — file uploads are no longer supported. */
export default async function UploadReportFileRedirectPage({
  params,
}: {
  params: Promise<{ learner_id: string }>;
}) {
  const { learner_id } = await params;
  redirect(`/dashboard/reports/${learner_id}/add`);
}
