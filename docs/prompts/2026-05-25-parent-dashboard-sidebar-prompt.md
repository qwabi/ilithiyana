# Parent dashboard sidebar — implementation prompt

**Date:** 2026-05-25  
**Plan:** [.cursor/plans/parent_dashboard_sidebar_b644e42b.plan.md](../../.cursor/plans/parent_dashboard_sidebar_b644e42b.plan.md)

## Goal

Deliver a parent dashboard with a persistent sidebar, section routes (overview, children, schedules, reports, subscriptions), payment-gated add-child flow, and report upload → OCR → confirm → class allocation—using the existing Supabase schema and server actions.

## Context

- **Exists:** `getParentDashboard`, `AddChildWizard`, `uploadLearnerReport`, `confirmReportResults`, PayFast return fulfillment, `ConditionalNavbar`, confirm page at `/dashboard/reports/confirm/[report_id]`.
- **Schema:** `parents.profile_id` → `profiles.id`; `learners.parent_id` → `parents.id`; schedules via `classes` + `class_sessions` (not `class_enrollments`).

## Scope

- In scope: layout shell, sidebar nav, section pages, redirects from legacy paths, `redirect` query on payment return for dashboard add-child.
- Out of scope: New REST APIs duplicating server actions; ITN/webhooks; `class_enrollments` table.

## Implementation instructions

1. Add `lib/parent-dashboard-sections.ts` with `resolveParentContext`, section loaders, and shell profile helper.
2. Replace `app/dashboard/layout.tsx` with sidebar + parents-based auth display.
3. Slim `ParentDashboard` at `/dashboard`; add `/dashboard/children`, `/dashboard/children/add`, schedules, reports, subscriptions routes and card components.
4. Redirect `/dashboard/add-child` and `/dashboard/learners/:id/reports` to new paths.
5. Extend `buildPayfastReturnUrls` / `parsePaymentReturnParams` with `redirect`; wire `/payment/return` and cancelled CTA to `/dashboard/children` or `/dashboard/children/add`.
6. On report confirm success, redirect to `/dashboard/schedules`.

## Acceptance

- Parent sees sidebar on all `/dashboard/*` routes; overview at `/dashboard`; Children nav active on `/dashboard` and `/dashboard/children*`.
- Add child completes PayFast → fulfillment → children list; no learner before payment.
- Report upload redirects to confirm; allocation only after confirm; schedules page shows sessions when allocated.
- `npm run build` compiles dashboard routes (pre-existing unrelated page errors excluded).
