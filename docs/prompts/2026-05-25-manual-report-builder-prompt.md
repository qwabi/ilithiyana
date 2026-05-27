# Manual report builder — implementation prompt

**Date:** 2026-05-25  
**Plan:** Manual report builder (two-path report entry)

## Goal

Parents choose between **manual subject entry** (report builder) or **file upload + OCR**. Manual path skips OCR, auto-confirms, writes levels, and runs class allocation immediately.

## Context

- Curriculum catalog: `lib/curriculum/subjects.ts` (DBE Junior/FET lists, `tutoringSubject` bridge to site-config).
- NSC math reused from `lib/reports/nsc.ts`.
- Save via `saveManualReport` server action (not REST).
- Migration: nullable `file_url`, `file_type` includes `manual`.

## Routes

- `/dashboard/reports/[learner_id]/upload` — choice page
- `/dashboard/reports/[learner_id]/upload/file` — file upload (OCR)
- `/dashboard/reports/[learner_id]/add` — report builder
- `/dashboard/reports/confirm/[id]?manual=true` — summary after manual save

## Acceptance

- Grade-appropriate subject search; no duplicate subjects; 0–100 validation.
- Manual report: `file_type=manual`, extractions with `parent_corrected=true`, allocation for offered tutoring subjects.
- File path unchanged: upload → OCR → confirm → allocate.
- Apply migration before production manual saves.
