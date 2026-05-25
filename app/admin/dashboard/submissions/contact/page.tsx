import { format } from 'date-fns';
import { fetchContactMessages } from '@/app/actions/admin-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';
const adminCard = 'rounded-xl border-[0.5px] border-border bg-white shadow-sm';

export default async function ContactMessagesPage() {
  const { data, error } = await fetchContactMessages();

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Contact messages</h1>
      <p className='mb-8 text-muted-foreground'>
        Enquiries submitted via the contact form (stored in Supabase).
      </p>

      {error && (
        <p className='mb-4 text-sm text-destructive' role='alert'>
          {error}
        </p>
      )}

      <div className='grid gap-4 md:grid-cols-2'>
        {data.map((msg) => (
          <Card key={msg.id} className={adminCard}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-lg font-semibold text-foreground'>
                {msg.name}
              </CardTitle>
              <p className='text-sm text-muted-foreground'>
                {format(new Date(msg.created_at), 'd MMM yyyy HH:mm')}
              </p>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <p>
                <a
                  href={`mailto:${msg.email}`}
                  className='font-medium text-primary underline-offset-2 hover:underline'
                >
                  {msg.email}
                </a>
              </p>
              {msg.phone ? <p className='text-muted-foreground'>Phone: {msg.phone}</p> : null}
              <p className='whitespace-pre-wrap text-foreground/90'>{msg.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!data.length && !error && (
        <p className='text-muted-foreground'>No contact messages yet.</p>
      )}
    </div>
  );
}
