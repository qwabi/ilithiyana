/**
 * Delete all application rows from the linked Supabase project (keeps tables + packages catalog).
 *
 * Run from the repo root (not the supabase/ folder):
 *   npm run db:empty              # dry-run: show row counts only
 *   npm run db:empty -- --confirm # actually delete
 *
 * Uses RPC `empty_application_data` when available (migration 20260528160000).
 * Falls back to row-by-row deletes if the RPC is not deployed yet.
 *
 * Options:
 *   --confirm            Required to delete
 *   --keep-class-catalog Keep shared group classes (learner_id is null)
 *   --purge-auth         Delete auth.users except KEEP_AUTH_EMAILS
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Optional — not deployed on all projects. */
const OPTIONAL_TABLES = new Set(['prospective_leads']);

const TABLES_DELETE_ORDER = [
  'session_attendance',
  'class_sessions',
  'class_enrollments',
  'learner_level_change_alerts',
  'class_waitlist',
  'report_extractions',
  'learner_subject_levels',
  'learner_reports',
  'payments',
  'tutor_timesheets',
  'subscriptions',
  'applications',
  'enrollment_leads',
  'onboarding_sessions',
  'prospective_leads',
  'classes',
  'learners',
  'parents',
  'tutors',
  'contact_messages',
  'profiles',
] as const;

const KEEP_AUTH_EMAILS = new Set(
  (process.env.KEEP_AUTH_EMAILS ??
    'masande@ilithiyana.com,benn@qwabi.co.za')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes('--confirm'),
    keepClassCatalog: argv.includes('--keep-class-catalog'),
    purgeAuth: argv.includes('--purge-auth'),
  };
}

function fail(msg: string): never {
  console.error(`\n${msg}`);
  process.exit(1);
}

function isProductionUrl(projectUrl: string): boolean {
  const allow = process.env.ALLOW_EMPTY_DB_HOSTS?.split(',').map((h) => h.trim());
  if (allow?.length) {
    try {
      const host = new URL(projectUrl).hostname;
      return !allow.some((h) => host === h || host.endsWith(h));
    } catch {
      return true;
    }
  }
  return /ilithiyana\.co\.za/i.test(projectUrl) && process.env.FORCE_EMPTY_DB !== '1';
}

function isMissingTableError(message: string): boolean {
  return (
    /could not find the table/i.test(message) ||
    /schema cache/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

async function countTable(
  supabase: SupabaseClient,
  table: string
): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) {
    if (OPTIONAL_TABLES.has(table) && isMissingTableError(error.message)) {
      return null;
    }
    return null;
  }
  return count ?? 0;
}

async function deleteAllRows(
  supabase: SupabaseClient,
  table: string
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const { error } = await supabase.from(table).delete().not('id', 'is', null);
  if (error) {
    if (OPTIONAL_TABLES.has(table) && isMissingTableError(error.message)) {
      return { ok: true, skipped: true };
    }
    return { ok: false, error: error.message };
  }

  const remaining = await countTable(supabase, table);
  if (remaining && remaining > 0) {
    return {
      ok: false,
      error: `${remaining} row(s) still remain after delete`,
    };
  }

  return { ok: true };
}

async function deleteClasses(
  supabase: SupabaseClient,
  keepCatalog: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (keepCatalog) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .not('learner_id', 'is', null);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  return deleteAllRows(supabase, 'classes');
}

async function emptyViaRpc(
  supabase: SupabaseClient,
  keepClassCatalog: boolean
): Promise<{ ok: true; remaining: Record<string, number> } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('empty_application_data', {
    p_keep_class_catalog: keepClassCatalog,
  });

  if (error) {
    if (
      /could not find the function/i.test(error.message) ||
      /schema cache/i.test(error.message)
    ) {
      return { ok: false, error: 'rpc_not_found' };
    }
    return { ok: false, error: error.message };
  }

  const payload = data as { ok?: boolean; remaining?: Record<string, number> };
  return {
    ok: true,
    remaining: payload?.remaining ?? {},
  };
}

async function emptyViaDeletes(
  supabase: SupabaseClient,
  keepClassCatalog: boolean
): Promise<void> {
  for (const table of TABLES_DELETE_ORDER) {
    if (table === 'classes') {
      const result = await deleteClasses(supabase, keepClassCatalog);
      if (!result.ok) fail(`classes: ${result.error}`);
      console.log(
        `  cleared ${table}${keepClassCatalog ? ' (per-learner)' : ''}`
      );
      continue;
    }

    const result = await deleteAllRows(supabase, table);
    if (result.skipped) {
      console.log(`  skipped ${table} (table not on this project)`);
      continue;
    }
    if (!result.ok) fail(`${table}: ${result.error}`);
    console.log(`  cleared ${table}`);
  }
}

async function purgeAuthUsers(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 500 });
  if (error) fail(`list auth users: ${error.message}`);

  let removed = 0;
  for (const user of data.users) {
    const email = user.email?.toLowerCase() ?? '';
    if (!email || KEEP_AUTH_EMAILS.has(email)) continue;
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.warn(`  skip auth delete ${email}: ${delErr.message}`);
      continue;
    }
    removed += 1;
    console.log(`  removed auth user ${email}`);
  }
  console.log(
    `Auth purge done (${removed} removed, kept: ${[...KEEP_AUTH_EMAILS].join(', ')})`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!url || !serviceKey) {
    fail('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  if (isProductionUrl(url)) {
    fail(
      'This URL looks like production. Set FORCE_EMPTY_DB=1 to override, or ALLOW_EMPTY_DB_HOSTS for your dev project ref.'
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Project: ${url}`);
  console.log(
    args.confirm
      ? 'Mode: DELETE (rows only, packages catalog kept)'
      : 'Mode: dry-run (pass --confirm to delete)'
  );
  if (args.keepClassCatalog) {
    console.log('Option: keep shared class catalog rows (learner_id is null)');
  }
  if (args.purgeAuth) {
    console.log(
      `Option: purge auth users except ${[...KEEP_AUTH_EMAILS].join(', ')}`
    );
  }
  console.log('');

  const pkgCount = await countTable(supabase, 'packages');
  console.log(`packages (kept): ${pkgCount ?? '?'}`);

  for (const table of TABLES_DELETE_ORDER) {
    const n = await countTable(supabase, table);
    if (n === null && OPTIONAL_TABLES.has(table)) {
      console.log(`  ${table}: (not deployed)`);
      continue;
    }
    const label =
      table === 'classes' && args.keepClassCatalog
        ? `${table} (per-learner only)`
        : table;
    console.log(`  ${label}: ${n ?? 'error'}`);
  }

  if (!args.confirm) {
    console.log('\nNo rows deleted. Re-run with: npm run db:empty -- --confirm');
    console.log(
      'Tip: apply migration 20260528160000_empty_application_data_rpc.sql for a one-shot TRUNCATE.'
    );
    return;
  }

  console.log('\nDeleting…');

  const rpc = await emptyViaRpc(supabase, args.keepClassCatalog);
  if (rpc.ok) {
    console.log('  used empty_application_data() RPC (truncate)');
    if (Object.keys(rpc.remaining).length) {
      console.log('  remaining:', rpc.remaining);
    }
  } else if (rpc.error === 'rpc_not_found') {
    console.log(
      '  RPC not found — using row deletes. Run: npx supabase db push --linked'
    );
    await emptyViaDeletes(supabase, args.keepClassCatalog);
  } else {
    fail(`empty_application_data: ${rpc.error}`);
  }

  if (args.purgeAuth) {
    await purgeAuthUsers(supabase);
  }

  console.log('\nDone. Row counts after empty:');
  for (const table of TABLES_DELETE_ORDER) {
    const n = await countTable(supabase, table);
    if (n === null && OPTIONAL_TABLES.has(table)) {
      console.log(`  ${table}: (not deployed)`);
      continue;
    }
    console.log(`  ${table}: ${n ?? '?'}`);
  }
  console.log(`  packages (kept): ${(await countTable(supabase, 'packages')) ?? '?'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
