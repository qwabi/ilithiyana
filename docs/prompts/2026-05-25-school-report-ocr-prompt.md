# School report OCR, level extraction, and class allocation

## Goal

When a parent uploads a South African school report (application or dashboard), the platform stores it, runs OCR after PayFast payment (or immediately on dashboard upload), extracts NSC subject levels, lets the parent confirm results, and auto-allocates learners to class bands (A–D) per subject—with admin override and termly re-upload support.

## Context

**Exists:** Supabase storage (`application-documents`), enrollment leads + PayFast ITN, parent dashboard, `class_enrollments`, admin `classes` UI (legacy learner-bound rows).

**Added:** `learner_reports`, `report_extractions`, `learner_subject_levels`, `class_waitlist`, `learner_level_change_alerts`; NSC helpers; OCR + LLM extraction; confirm UI; allocation after confirm; cron for missing-report reminders.

## Scope

- Repo: `ilithiyana` (Next.js 14 App Router)
- Migrations: `supabase/migrations/20260525100000_school_reports_ocr.sql`
- Env: `ANTHROPIC_API_KEY` and/or `GOOGLE_CLOUD_VISION_API_KEY`

**Out of scope (follow-up):** Full admin learner profile charts, tutor notes UI, catalog class seeding in admin.

## Plan link

`.cursor/plans/ilithiyana_academics_rebrand_6e4bb424.plan.md` (parent platform)

## Implementation instructions

1. Apply migration `20260525100000_school_reports_ocr.sql` to Supabase.
2. Set `ANTHROPIC_API_KEY` (required for structured extraction; vision OCR fallback).
3. Seed **catalog** `classes` rows (`learner_id` null): grade, band, subject, `max_enrollment`, `is_active`.
4. PayFast ITN → `triggerReportOcrAfterPayment` after conversion.
5. Parent confirms at `/dashboard/reports/confirm/[report_id]` → `allocateLearnerToClasses`.
6. Schedule cron: `GET /api/cron/report-reminders?secret=` (48h, `allocation_status = pending_report`).

## Acceptance

- [ ] Report upload accepts PDF/JPG/PNG/WEBP ≤10MB; optional on apply form.
- [ ] OCR runs after payment; parent can confirm levels; bands update live from %.
- [ ] Confirmed levels write `learner_subject_levels` and create enrollments or waitlist.
- [ ] Dashboard shows pending confirmation banner and per-learner reports page.
- [ ] Emails: OCR complete, missing report (cron), level change, allocation/waitlist.
