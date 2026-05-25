import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PenLine, Upload } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ReportEntryChoicePage({
  params,
}: {
  params: { learner_id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?from=/dashboard/reports/${params.learner_id}/upload`);
  }

  const { data: learner } = await supabase
    .from('learners')
    .select('id, first_name, last_name, parents ( profile_id )')
    .eq('id', params.learner_id)
    .single();

  if (!learner) {
    redirect('/dashboard/reports');
  }

  const parent = learner.parents as { profile_id: string | null } | null;
  if (parent?.profile_id !== user.id) {
    redirect('/dashboard/reports');
  }

  const learnerName = `${learner.first_name} ${learner.last_name}`;

  return (
    <div className='mx-auto max-w-lg'>
      <Link
        href={`/dashboard/reports/${params.learner_id}`}
        className='text-sm text-muted-foreground hover:underline'
      >
        ← Back to reports
      </Link>
      <h1 className='mt-4 [font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)]'>
        Add a school report
      </h1>
      <p className='mt-1 text-sm text-muted-foreground'>
        Choose how to add results for {learnerName} this term.
      </p>

      <div className='mt-8 grid gap-4'>
        <Link
          href={`/dashboard/reports/${params.learner_id}/add`}
          className='group rounded-xl border-2 border-primary/30 bg-white p-6 transition-all hover:border-primary'
        >
          <div className='flex items-start gap-4'>
            <div
              className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                         bg-[hsl(210,100%,96%)] transition-colors group-hover:bg-[hsl(210,100%,92%)]'
            >
              <PenLine className='text-[hsl(210,100%,35%)]' size={20} />
            </div>
            <div>
              <p className='font-semibold text-foreground'>Enter results manually</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                Type subject names and marks directly. Best when you have the
                report in front of you.
              </p>
              <span
                className='mt-2 inline-block rounded-full bg-[hsl(210,100%,96%)]
                           px-2 py-0.5 text-xs font-semibold text-[hsl(210,100%,35%)]'
              >
                Recommended
              </span>
            </div>
          </div>
        </Link>

        <Link
          href={`/dashboard/reports/${params.learner_id}/upload/file`}
          className='group rounded-xl border border-border bg-white p-6 transition-all hover:border-primary/40'
        >
          <div className='flex items-start gap-4'>
            <div
              className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                         bg-muted/50 transition-colors group-hover:bg-muted'
            >
              <Upload className='text-muted-foreground' size={20} />
            </div>
            <div>
              <p className='font-semibold text-foreground'>Upload a file</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                Upload a scanned report card (PDF, JPG, PNG). We will try to
                read it automatically.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
