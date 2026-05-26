import { listLearnersForAdmin } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/server';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function AdminLearnersPage() {
  let learners: Awaited<ReturnType<typeof listLearnersForAdmin>> = [];

  if (isSupabaseConfigured()) {
    try {
      learners = await listLearnersForAdmin();
    } catch {
      learners = [];
    }
  }

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Learners</h1>
      <p className='mb-8 text-muted-foreground'>
        Enrolled learners across all parent accounts.
      </p>
      <div className='overflow-x-auto rounded-xl border border-border bg-white shadow-sm'>
        <table className='w-full text-left text-sm'>
          <thead className='border-b bg-muted/50'>
            <tr>
              <th className='px-4 py-3 font-medium'>Name</th>
              <th className='px-4 py-3 font-medium'>Grade</th>
              <th className='px-4 py-3 font-medium'>School</th>
            </tr>
          </thead>
          <tbody>
            {learners.map((l) => (
              <tr key={l.id} className='border-b last:border-0'>
                <td className='px-4 py-3'>
                  {l.first_name} {l.last_name}
                </td>
                <td className='px-4 py-3'>{l.grade}</td>
                <td className='px-4 py-3'>{l.school_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
