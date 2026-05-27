'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Copy, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getOutreachEmailTemplates,
  outreachOfferSummary,
  outreachStatusLabels,
  type OutreachContactStatus,
} from '@/lib/outreach/copy';
import {
  deleteOutreachContact,
  importOutreachContacts,
  listOutreachContacts,
  updateOutreachContactStatus,
  type OutreachContactRow,
} from '@/app/actions/outreach-actions';

const adminCard = 'rounded-xl border-[0.5px] border-border bg-white shadow-sm';

type Props = {
  initialContacts: OutreachContactRow[];
  initialError?: string;
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function OutreachKickoffClient({
  initialContacts,
  initialError,
}: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [pasteValue, setPasteValue] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [templateFirstName, setTemplateFirstName] = useState('');
  const [templateMutualName, setTemplateMutualName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const templates = useMemo(
    () =>
      getOutreachEmailTemplates({
        firstName: templateFirstName,
        mutualName: templateMutualName,
      }),
    [templateFirstName, templateMutualName]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<OutreachContactStatus, number> = {
      new: 0,
      contacted: 0,
      replied: 0,
      not_interested: 0,
    };
    for (const c of contacts) {
      counts[c.status] += 1;
    }
    return counts;
  }, [contacts]);

  const handleImport = () => {
    setImportMessage(null);
    startTransition(async () => {
      const result = await importOutreachContacts(pasteValue);
      if (!result.ok) {
        setImportMessage(result.error ?? 'Import failed.');
        return;
      }
      const parts = [
        `Added ${result.inserted} contact${result.inserted === 1 ? '' : 's'}.`,
      ];
      if (result.skipped) {
        parts.push(`${result.skipped} duplicate(s) skipped.`);
      }
      if (result.invalid.length) {
        parts.push(`${result.invalid.length} invalid token(s) ignored.`);
      }
      setImportMessage(parts.join(' '));
      setPasteValue('');
      const { data } = await listOutreachContacts();
      setContacts(data);
    });
  };

  const handleStatusChange = useCallback(
    (id: string, status: OutreachContactStatus) => {
      startTransition(async () => {
        const result = await updateOutreachContactStatus(id, status);
        if (result.ok) {
          setContacts((prev) =>
            prev.map((c) => (c.id === id ? { ...c, status } : c))
          );
        }
      });
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      const result = await deleteOutreachContact(id);
      if (result.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
      }
    });
  }, []);

  const handleCopyTemplate = async (templateId: string, subject: string, body: string) => {
    await copyText(`Subject: ${subject}\n\n${body}`);
    setCopiedId(templateId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className='space-y-8'>
      {initialError ? (
        <p className='text-sm text-destructive' role='alert'>
          {initialError}
        </p>
      ) : null}

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card className={adminCard}>
          <CardHeader>
            <CardTitle className='text-lg'>Offer snapshot</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Pulled from the public site — use this when personalizing outreach.
            </p>
          </CardHeader>
          <CardContent className='space-y-3 text-sm'>
            <p>
              <span className='font-medium text-foreground'>
                {outreachOfferSummary.brandName}
              </span>
              {' — '}
              {outreachOfferSummary.tagline}
            </p>
            <p className='text-muted-foreground'>{outreachOfferSummary.description}</p>
            <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
              <li>Group size: {outreachOfferSummary.ratio}</li>
              <li>Pay per lesson: {outreachOfferSummary.pricing.perLesson}</li>
              <li>Monthly package: {outreachOfferSummary.pricing.monthly}</li>
            </ul>
            <p>
              <a
                href={outreachOfferSummary.applyUrl}
                className='font-medium text-primary underline-offset-2 hover:underline'
                target='_blank'
                rel='noreferrer'
              >
                Apply Now
              </a>
              {' · '}
              <a
                href={outreachOfferSummary.whatsapp}
                className='font-medium text-primary underline-offset-2 hover:underline'
                target='_blank'
                rel='noreferrer'
              >
                WhatsApp
              </a>
            </p>
          </CardContent>
        </Card>

        <Card className={adminCard}>
          <CardHeader>
            <CardTitle className='text-lg'>Import contacts</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Paste emails from your address book (comma, space, or newline separated).
              You can add more anytime.
            </p>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='outreach-emails'>Email addresses</Label>
              <Textarea
                id='outreach-emails'
                rows={6}
                placeholder='parent1@example.com, parent2@example.com&#10;parent3@example.com'
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                disabled={pending}
              />
            </div>
            <Button onClick={handleImport} disabled={pending || !pasteValue.trim()}>
              Import contacts
            </Button>
            {importMessage ? (
              <p className='text-sm text-muted-foreground'>{importMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className={adminCard}>
        <CardHeader>
          <CardTitle className='text-lg'>Email templates</CardTitle>
          <p className='text-sm text-muted-foreground'>
            Copy into your mail client. Replace placeholders before sending.
          </p>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex flex-wrap gap-4'>
            <div className='space-y-1'>
              <Label htmlFor='tpl-first'>Parent first name (optional)</Label>
              <input
                id='tpl-first'
                className='h-10 w-48 rounded-lg border border-input bg-white px-3 text-sm'
                value={templateFirstName}
                onChange={(e) => setTemplateFirstName(e.target.value)}
                placeholder='Thandi'
              />
            </div>
            <div className='space-y-1'>
              <Label htmlFor='tpl-mutual'>Mutual name (warm intro)</Label>
              <input
                id='tpl-mutual'
                className='h-10 w-48 rounded-lg border border-input bg-white px-3 text-sm'
                value={templateMutualName}
                onChange={(e) => setTemplateMutualName(e.target.value)}
                placeholder='Sipho'
              />
            </div>
          </div>

          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className='rounded-lg border border-border/80 bg-muted/30 p-4'
            >
              <div className='mb-3 flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='font-medium text-foreground'>{tpl.label}</p>
                  <p className='text-xs text-muted-foreground'>{tpl.description}</p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => handleCopyTemplate(tpl.id, tpl.subject, tpl.body)}
                >
                  <Copy className='mr-2 h-4 w-4' />
                  {copiedId === tpl.id ? 'Copied' : 'Copy subject + body'}
                </Button>
              </div>
              <p className='mb-2 text-sm'>
                <span className='font-medium'>Subject:</span> {tpl.subject}
              </p>
              <pre className='max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs leading-relaxed text-foreground/90'>
                {tpl.body}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <div className='mb-4 flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h2 className='text-xl font-semibold text-foreground'>Contact list</h2>
            <p className='text-sm text-muted-foreground'>
              {contacts.length} total · {statusCounts.new} new · {statusCounts.contacted}{' '}
              contacted · {statusCounts.replied} replied
            </p>
          </div>
        </div>

        {!contacts.length ? (
          <p className='text-muted-foreground'>
            No contacts yet. Import emails above when your list is ready.
          </p>
        ) : (
          <div className='overflow-x-auto rounded-xl border border-border'>
            <table className='w-full min-w-[640px] text-left text-sm'>
              <thead className='border-b border-border bg-muted/40'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Email</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium'>Added</th>
                  <th className='px-4 py-3 font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((row) => (
                  <tr key={row.id} className='border-b border-border/60 last:border-0'>
                    <td className='px-4 py-3'>
                      <a
                        href={`mailto:${row.email}`}
                        className='inline-flex items-center gap-1.5 font-medium text-primary hover:underline'
                      >
                        <Mail className='h-3.5 w-3.5' />
                        {row.email}
                      </a>
                    </td>
                    <td className='px-4 py-3'>
                      <Select
                        value={row.status}
                        onValueChange={(v) =>
                          handleStatusChange(row.id, v as OutreachContactStatus)
                        }
                        disabled={pending}
                      >
                        <SelectTrigger className='h-9 w-[160px]'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(outreachStatusLabels) as OutreachContactStatus[]).map(
                            (s) => (
                              <SelectItem key={s} value={s}>
                                {outreachStatusLabels[s]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className='px-4 py-3 text-muted-foreground'>
                      {format(new Date(row.created_at), 'd MMM yyyy')}
                    </td>
                    <td className='px-4 py-3'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className={cn('h-8 w-8 text-muted-foreground hover:text-destructive')}
                        onClick={() => handleDelete(row.id)}
                        disabled={pending}
                        aria-label={`Remove ${row.email}`}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
