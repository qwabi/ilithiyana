# Parent onboarding flow — implementation prompt

**Date:** 2026-05-26  
**Plan:** `.cursor/plans/parent_onboarding_flow_bf1001b6.plan.md`

## Goal

Replace the monolithic `/apply-now` form with a six-step `/onboarding/*` wizard backed by `onboarding_sessions`. Parents pay once for all children via PayFast, then complete child profiles, optional manual reports, and land on the dashboard.

## Context

- **Exists:** `provisionParentAccount`, PayFast helpers, `packages` in `lib/site-config.ts`, `saveManualReport`, parent portal schema, dashboard resume banner shell.
- **Missing (built in this pass):** `onboarding_sessions` table, API routes under `/api/onboarding/*`, `/onboarding/*` UI, `confirm_onboarding_payment` RPC, per-slot learner fulfillment after payment.

## Scope

- **In scope:** Migration, lib + API + actions, all onboarding pages/components, `/apply-now` redirect, navbar/middleware, docs prompt.
- **Out of scope:** PayFast ITN/webhook, per-child separate checkouts, OCR reports during onboarding.

## Implementation instructions

1. Apply `supabase/migrations/20260527100000_onboarding_sessions.sql` remotely.
2. Verify `20260526100000_manual_learner_reports.sql` is applied.
3. Run `npm run build`.
4. Sandbox test: account → 2 children → PayFast → setup (both profiles) → optional report → complete → dashboard.

## Acceptance

- `/apply-now` redirects to `/onboarding/account`.
- No marketing navbar on `/onboarding/*`.
- Setup blocked until `payment_status = complete`.
- Learners created only after payment, one slot at a time.
- Mid-flow refresh resumes at `current_step`.
- `npm run build` passes.
