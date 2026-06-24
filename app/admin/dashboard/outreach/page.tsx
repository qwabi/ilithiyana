import { OutreachKickoffClient } from '@/app/components/admin/OutreachKickoffClient';
import { listOutreachContacts } from '@/app/actions/outreach-actions';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';

export default async function AdminOutreachPage() {
  const { data, error } = await listOutreachContacts();

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Parent outreach</h1>
      <p className='mb-8 max-w-2xl text-muted-foreground'>
        Kick off sales outreach to South African parents: import your contact list,
        track status, and copy email templates aligned with{' '}
        <strong className='font-medium text-foreground'>Ilithiyana Academics</strong>{' '}
        (from R175 per lesson). Warm-intro and direct parent drafts included.
      </p>
      <OutreachKickoffClient initialContacts={data} initialError={error} />
    </div>
  );
}
