/**
 * E2E enrollment smoke test — uses real schema column names.
 * Run: npm run smoke-test (requires .env.local with Supabase service role)
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg: string) {
  console.log(`OK: ${msg}`);
}

async function main() {
  if (!url || !serviceKey) {
    fail('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const testEmail = `smoke-${Date.now()}@example.test`;

  const { data: lead, error: leadErr } = await supabase
    .from('enrollment_leads')
    .insert({
      status: 'awaiting_payment',
      parent_first_name: 'Smoke',
      parent_last_name: 'Test',
      parent_email: testEmail,
      parent_phone: '0820000000',
      province: 'Gauteng',
      learner_first_name: 'Learner',
      learner_last_name: 'Test',
      learner_date_of_birth: '2010-01-15',
      learner_school_name: 'Smoke High',
      learner_grade: 10,
      subjects: ['Pure Maths'],
      package_id: 'package-a',
      amount_cents: 100000,
    })
    .select('id')
    .single();

  if (leadErr || !lead) {
    fail(`insert enrollment_leads: ${leadErr?.message ?? 'no row'}`);
  }
  ok(`created lead ${lead.id}`);

  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    'convert_paid_enrollment_lead',
    {
      p_lead_id: lead.id,
      p_payfast_payment_id: 'smoke-test',
      p_itn_payload: { source: 'smoke-test' },
      p_payfast_token: '',
    }
  );

  if (rpcErr) {
    await supabase.from('enrollment_leads').delete().eq('id', lead.id);
    fail(`convert_paid_enrollment_lead: ${rpcErr.message}`);
  }

  const payload = rpcResult as Record<string, unknown>;
  const parentId = String(payload.parent_id ?? '');
  const applicationId = String(payload.application_id ?? '');

  if (!parentId || !applicationId) {
    fail('RPC missing parent_id or application_id');
  }
  ok(`converted parent=${parentId} application=${applicationId}`);

  const { data: paidLead } = await supabase
    .from('enrollment_leads')
    .select('status, converted_application_id')
    .eq('id', lead.id)
    .single();

  if (paidLead?.status !== 'paid') {
    fail(`lead status expected paid, got ${paidLead?.status}`);
  }
  ok('lead status is paid');

  const { data: parentRow } = await supabase
    .from('parents')
    .select('id, email')
    .eq('id', parentId)
    .single();

  if (!parentRow) {
    fail('parents row missing after conversion');
  }
  ok(`parents row exists for ${parentRow.email}`);

  const { count: learnerCount } = await supabase
    .from('learners')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', parentId);

  if (!learnerCount) {
    fail('no learners for parent');
  }
  ok(`learners count=${learnerCount}`);

  console.log('\nSmoke test passed.');
  console.log(
    'Manual test account: open /payment/return?status=success&application_id=<leadId>&package=package-a&learner_name=Test'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
