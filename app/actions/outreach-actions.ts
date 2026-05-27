'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { OutreachContactStatus } from '@/lib/outreach/copy';

const EMAIL_SPLIT = /[\s,;]+/;

const emailSchema = z.string().email();

export type OutreachContactRow = {
  id: string;
  email: string;
  display_name: string | null;
  notes: string | null;
  source: string;
  status: OutreachContactStatus;
  created_at: string;
  updated_at: string;
};

export type ImportOutreachContactsResult = {
  ok: boolean;
  inserted: number;
  skipped: number;
  invalid: string[];
  error?: string;
};

function parseEmailList(raw: string): {
  valid: string[];
  invalid: string[];
} {
  const tokens = raw
    .split(EMAIL_SPLIT)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const parsed = emailSchema.safeParse(token);
    if (!parsed.success) {
      invalid.push(token);
      continue;
    }
    if (seen.has(parsed.data)) continue;
    seen.add(parsed.data);
    valid.push(parsed.data);
  }

  return { valid, invalid };
}

export async function listOutreachContacts(): Promise<{
  data: OutreachContactRow[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('outreach_contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as OutreachContactRow[] };
}

export async function importOutreachContacts(
  rawEmails: string,
  source = 'import'
): Promise<ImportOutreachContactsResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      invalid: [],
      error: 'Supabase is not configured.',
    };
  }

  const { valid, invalid } = parseEmailList(rawEmails);

  if (!valid.length) {
    return {
      ok: false,
      inserted: 0,
      skipped: 0,
      invalid,
      error: invalid.length
        ? 'No valid emails found. Check the addresses and try again.'
        : 'Paste at least one email address.',
    };
  }

  const supabase = createServiceClient();

  let inserted = 0;
  let skipped = 0;

  for (const email of valid) {
    const { error: insertError } = await supabase.from('outreach_contacts').insert({
      email,
      source,
      status: 'new',
    });

    if (insertError) {
      if (insertError.code === '23505') {
        skipped += 1;
      } else {
        return {
          ok: false,
          inserted,
          skipped,
          invalid,
          error: insertError.message,
        };
      }
    } else {
      inserted += 1;
    }
  }

  revalidatePath('/admin/dashboard/outreach');
  return { ok: true, inserted, skipped, invalid };
}

export async function updateOutreachContactStatus(
  id: string,
  status: OutreachContactStatus
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('outreach_contacts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/dashboard/outreach');
  return { ok: true };
}

export async function deleteOutreachContact(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase is not configured.' };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('outreach_contacts').delete().eq('id', id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/dashboard/outreach');
  return { ok: true };
}
