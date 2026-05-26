import { redirect } from 'next/navigation';

/** Class groups are seeded per grade/subject/band — use the list to edit. */
export default function NewClassPage() {
  redirect('/admin/dashboard/classes');
}
