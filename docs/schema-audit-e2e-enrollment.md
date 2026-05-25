# Schema audit — E2E enrollment (2026-05-25)

Live SQL audit was not run from the agent (Supabase MCP `execute_sql` may be permission-denied). Migrations in `supabase/migrations/` are the source of truth.

## Canonical model (do not rewrite)

| Table | Key columns / notes |
|-------|---------------------|
| `profiles` | `id` = `auth.users.id` (no `user_id` column) |
| `parents` | Business entity; `profile_id` → `profiles.id` |
| `enrollment_leads` | `parent_first_name`, `parent_last_name`, `parent_email`, `amount_cents`, status enum `awaiting_payment` \| `paid` \| … |
| Post-payment | `convert_paid_enrollment_lead` / `convert_add_child_lead` RPC (returns `jsonb`) |

## Indexes and storage (already in migrations)

- `enrollment_leads_email_idx` on `(parent_email)` — `20260524120000_prospective_leads.sql`
- Storage bucket **`application-documents`** — `20260524140000_storage_buckets.sql` (not `documents`)

## Manual verification (Supabase SQL Editor)

```sql
-- Row counts for test account
select count(*) from profiles p join auth.users u on u.id = p.id where u.email = 'abqwabi@gmail.com';
select * from parents where lower(email) = 'abqwabi@gmail.com' order by created_at desc limit 5;
select id, status, converted_application_id, paid_at from enrollment_leads
  where lower(parent_email) = 'abqwabi@gmail.com' order by created_at desc limit 5;
```

No additive migration was required for this pass.
