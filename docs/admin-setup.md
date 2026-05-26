# Admin setup

## Provisioning Masande (super admin + default tutor)

Masande Dudula is the default tutor for all class groups and needs both admin and tutor portal access.

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (with `NEXT_PUBLIC_SUPABASE_URL`).
2. Optionally set `MASANDE_PASSWORD` to a secure password in `.env.local`.
3. Apply migrations (includes idempotent Masande SQL if the auth user already exists):

   ```bash
   npx supabase db push
   ```

4. Provision (creates auth user if missing, syncs profiles/tutor/admin rows, assigns unassigned classes):

   ```bash
   npm run provision:masande
   ```

   Or: `npx tsx scripts/provision-masande.ts`

The script is idempotent — safe to run multiple times. Re-run with `MASANDE_PASSWORD` set to rotate the login password.

Masande can access:

- `/admin/login` → `/admin/dashboard` (via `admin_profiles` + `profiles.role = admin`)
- `/tutor/login` → `/tutor/dashboard` (via `tutors` + `tutor_profiles.vetting_status = approved`)

Canonical email: `masande@ilithiyana.com` (legacy `masande@ilithiyana.co.za` is still recognized in code and migrations).

## Class groups

After migration `20260531000000_classes_group_model_v2.sql`, classes are shared groups:

- `learner_id = null` on `classes`
- Up to 8 learners per class via `class_enrollments`
- Bands A–D with labels (Foundation → Advanced)
- Structured schedule: `schedule_day` + `schedule_time` (SAST)

Manage groups at `/admin/dashboard/classes`.
