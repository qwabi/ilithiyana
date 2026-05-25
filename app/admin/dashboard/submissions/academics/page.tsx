import { redirect } from 'next/navigation';

/** Legacy route — applications live under /admin/dashboard/applications */
export default function AcademicsSubmissionsRedirect() {
  redirect('/admin/dashboard/applications');
}
