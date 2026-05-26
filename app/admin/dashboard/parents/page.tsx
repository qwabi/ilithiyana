import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function AdminParentsPage() {
  let parents: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    province: string;
    created_at: string;
  }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('parents')
      .select('id, first_name, last_name, email, phone, province, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    parents = data ?? [];
  }

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Parents</h1>
      <p className='mb-8 text-muted-foreground'>
        Guardian accounts linked to learners.
      </p>
      <div className='overflow-x-auto rounded-xl border border-border bg-white shadow-sm'>
        <table className='w-full text-left text-sm'>
          <thead className='border-b bg-muted/50'>
            <tr>
              <th className='px-4 py-3 font-medium'>Name</th>
              <th className='px-4 py-3 font-medium'>Email</th>
              <th className='px-4 py-3 font-medium'>Phone</th>
              <th className='px-4 py-3 font-medium'>Province</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <tr key={p.id} className='border-b last:border-0'>
                <td className='px-4 py-3'>
                  {p.first_name} {p.last_name}
                </td>
                <td className='px-4 py-3'>{p.email}</td>
                <td className='px-4 py-3'>{p.phone}</td>
                <td className='px-4 py-3'>{p.province}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
