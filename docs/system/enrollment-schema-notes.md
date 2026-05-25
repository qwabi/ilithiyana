# Enrollment schema (audit notes)

**Audited against:** `supabase/migrations/*.sql` (not live SQL — run plan audit queries in Supabase SQL Editor for row counts).

## Canonical model

| Table | Role | Auth link |
|-------|------|-----------|
| `profiles` | User metadata, `role` enum | `profiles.id` = `auth.users.id` |
| `parents` | Parent business entity | `parents.profile_id` → `profiles.id` |
| `enrollment_leads` | Pre-payment funnel | `status`: `awaiting_payment` → `paid` |
| `learners`, `applications`, `subscriptions`, `payments` | Post-payment (RPC `convert_paid_enrollment_lead`) | FK to `parents` |

Do **not** add `profiles.user_id` or replace `parents` with profiles-only dashboard reads.

## Payment conversion

- **Browser return:** `/payment/return?status=success&application_id=<lead_uuid>` calls `fulfillPaidEnrollmentLead` (service role).
- **ITN:** Not used in local/dev; optional for production later.

## Storage

- Bucket: `application-documents` (see `lib/supabase/storage.ts`).
