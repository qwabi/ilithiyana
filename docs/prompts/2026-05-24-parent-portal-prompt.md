# Parent portal — implementation prompt

**Date:** 2026-05-24

## Goal

After PayFast payment, parents receive a Supabase Auth invite, sign in at `/login`, and use `/dashboard` to view children, schedules, billing, and add additional learners via `/dashboard/add-child` (each requiring payment).

## Context

- Existing: `enrollment_leads`, `convert_paid_enrollment_lead`, `/api/payfast/notify`, email-cookie `/portal/parent`
- Added: migration `20260525000000_parent_portal.sql`, `@supabase/ssr`, `/api/payfast/itn`, branded Resend templates

## Scope

- In scope: Auth, ITN orchestration, dashboard, add-child, receipts PDF, RLS parent reads on payments
- Out of scope: Full admin `class_sessions` CRUD, tutor Auth migration

## Implementation instructions

1. Apply Supabase migration `20260525000000_parent_portal.sql`
2. Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`, run dev with ngrok for ITN URL
3. Verify Package A checkout includes PayFast subscription fields
4. Test first enrollment → `/welcome` → invite email → `/login` → `/dashboard`
5. Test add-child → pending application email

## Acceptance

- ITN signature and amount validated server-side only
- Parent cannot read other parents’ rows (RLS)
- Dashboard shows empty states (not blank tables) when no schedule
- Meet link hidden until 30 minutes before session
- `npm run build` passes
