import Link from 'next/link';
import { TutorTimesheetForm } from '@/app/tutor/_components/TutorTimesheetForm';
import { getTutorSession } from '@/lib/tutor/queries';

export const dynamic = 'force-dynamic';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-[hsl(210,100%,25%)]';

export default async function NewTutorTimesheetPage() {
  const session = await getTutorSession();
  if (!session) return null;

  return (
    <div className='space-y-6'>
      <div>
        <Link
          href='/tutor/timesheets'
          className='text-sm text-muted-foreground hover:text-foreground'
        >
          ← Timesheets
        </Link>
        <h1 className={`${pageTitle} mt-2`}>Submit timesheet</h1>
      </div>
      <TutorTimesheetForm tutor={session.tutor} />
    </div>
  );
}
