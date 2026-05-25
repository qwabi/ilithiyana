import { redirect } from 'next/navigation';

export default function LegacyParentPortalPage() {
  redirect('/dashboard');
}
