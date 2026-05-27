/**
 * Delete upcoming class_sessions and rebuild 4 weeks of staggered slots per learner.
 *
 *   npx tsx scripts/regenerate-class-schedules.ts           # dry-run counts
 *   npx tsx scripts/regenerate-class-schedules.ts --confirm # apply
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { regenerateSessionsForLearnerEnrollments } from '../lib/class-schedules';

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
const confirm = process.argv.includes('--confirm');

async function main() {
  if (!url || !serviceKey) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count: sessionCount } = await supabase
    .from('class_sessions')
    .select('id', { count: 'exact', head: true })
    .gte('scheduled_at', new Date().toISOString())
    .eq('cancelled', false);

  const { data: learners } = await supabase
    .from('learners')
    .select('id, first_name, last_name, grade')
    .eq('status', 'active');

  console.log(
    `Upcoming sessions: ${sessionCount ?? 0} · Active learners: ${learners?.length ?? 0}`
  );

  if (!confirm) {
    console.log('\nDry run. Pass --confirm to clear upcoming sessions and regenerate.');
    return;
  }

  for (const learner of learners ?? []) {
    const name = `${learner.first_name} ${learner.last_name}`;

    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('id, class_id, classes!inner ( subject, grade )')
      .eq('learner_id', learner.id)
      .eq('status', 'active');

    const keepBySubject = new Map<string, string>();
    const cancelIds: string[] = [];
    for (const row of enrollments ?? []) {
      const cls = row.classes as { subject: string; grade: number };
      const key = `${cls.grade}:${cls.subject}`;
      const existing = keepBySubject.get(key);
      if (!existing) {
        keepBySubject.set(key, row.class_id as string);
      } else if (row.class_id !== existing) {
        cancelIds.push(row.id as string);
      }
    }
    if (cancelIds.length) {
      await supabase
        .from('class_enrollments')
        .update({ status: 'cancelled' })
        .in('id', cancelIds);
      console.log(`  ${name}: cancelled ${cancelIds.length} duplicate enrollment(s)`);
    }

    const result = await regenerateSessionsForLearnerEnrollments(
      supabase,
      learner.id as string,
      'script:regenerate-class-schedules'
    );
    console.log(
      `  ${name} (grade ${learner.grade}): removed ${result.removed}, created ${result.created}`
    );
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
