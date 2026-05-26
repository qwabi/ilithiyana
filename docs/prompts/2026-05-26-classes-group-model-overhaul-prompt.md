# Classes group model overhaul

## Goal

Restructure Ilithiyana class scheduling around shared group classes (grade + subject + band A–D), structured weekly schedules, 8-learner caps, admin enrollment management, and Masande as default admin/tutor — without breaking existing enrollments or parent/tutor schedule views.

## Context

- Legacy `classes` rows used per-learner `learner_id` and free-text `level` / `schedule`.
- `class_enrollments` and `class_sessions` already exist; allocation flows through `lib/class-enrollments.ts` and `lib/reports/allocate-from-report.ts`.
- Migration `20260531000000_classes_group_model_v2.sql` adds `schedule_day`, `schedule_time`, `band_label`, `max_enrollment`, `is_active`, backfills data, provisions Masande, and seeds missing group rows.

## Scope

- Repo: `ilithiyana` (Next.js + Supabase)
- Admin UI: `/admin/dashboard/classes`
- Parent: `/dashboard/schedules`
- Tutor: `/tutor/schedule`
- Scripts: `scripts/provision-masande.ts`

## Implementation

1. Apply migration and run `scripts/provision-masande.ts` if needed.
2. Admin uses `listGroupClassesForAdmin`, detail enroll/unenroll with session regeneration.
3. Auto-enrollment respects `max_enrollment` with band fallback and overflow class creation.
4. Parent schedule reads enrollments → class metadata (band label, day/time SAST, meet link).

## Acceptance

- `npm run build` passes
- Admin grouped class list and detail edit/enroll flows work
- Parent schedule shows band + weekly time + meet link
- Tutor schedule grouped Mon–Sat with enrollment counts
- Masande can log in to admin and tutor portals after provisioning
