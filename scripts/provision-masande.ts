/**
 * Idempotent Masande admin + tutor provisioning.
 * Run: npx tsx scripts/provision-masande.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
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
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = 'masande@ilithiyana.com';

  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  let user = listData.users.find(
    (u) =>
      u.email === email ||
      u.email === 'masande@ilithiyana.co.za'
  );

  if (!user) {
    console.log('Creating auth user for Masande...');
    const password = process.env.MASANDE_PASSWORD ?? 'ChangeMe2026!';
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Masande Dudula', role: 'admin' },
    });
    if (error) throw error;
    user = data.user;
    console.log('Auth user created:', user.id);
  } else {
    console.log('Found existing auth user:', user.id, user.email);
  }

  const userId = user!.id;

  if (process.env.MASANDE_PASSWORD) {
    const { error: pwError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: process.env.MASANDE_PASSWORD }
    );
    if (pwError) throw pwError;
    console.log('Password updated from MASANDE_PASSWORD');
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      role: 'admin',
      full_name: 'Masande Dudula',
      email,
    },
    { onConflict: 'id' }
  );
  if (profileError) throw profileError;
  console.log('profiles row OK');

  const { data: tutor, error: tutorError } = await supabase
    .from('tutors')
    .upsert(
      {
        profile_id: userId,
        first_name: 'Masande',
        last_name: 'Dudula',
        email,
        subjects: [
          'Pure Maths',
          'Physical Science',
          'Life Sciences',
          'English',
          'Natural Sciences',
        ],
        session_rate_cents: 20000,
      },
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  if (tutorError) throw tutorError;
  const tutorId = tutor?.id;
  console.log('tutors row OK, id:', tutorId);

  if (tutorId) {
    const { error: tpError } = await supabase.from('tutor_profiles').upsert(
      {
        tutor_id: tutorId,
        vetting_status: 'approved',
        onboarding_complete: true,
        vetted_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id' }
    );
    if (tpError) throw tpError;
    console.log('tutor_profiles row OK');
  }

  const { error: adminError } = await supabase.from('admin_profiles').upsert(
    {
      profile_id: userId,
      is_active: true,
      full_name: 'Masande Dudula',
      email,
    },
    { onConflict: 'profile_id' }
  );
  if (adminError) throw adminError;
  console.log('admin_profiles row OK');

  if (tutorId) {
    const { data: updated, error: assignError } = await supabase
      .from('classes')
      .update({ tutor_id: tutorId })
      .is('tutor_id', null)
      .select('id');
    if (assignError) throw assignError;
    console.log(
      `Assigned Masande to ${updated?.length ?? 0} previously unassigned classes`
    );
  }

  console.log('\nMasande fully provisioned as admin + tutor');
  console.log('Login:', email);
  if (!process.env.MASANDE_PASSWORD) {
    console.log(
      'Password: ChangeMe2026! (set MASANDE_PASSWORD in .env.local and re-run to use a secure password)'
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
