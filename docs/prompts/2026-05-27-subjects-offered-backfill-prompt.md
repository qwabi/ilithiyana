---
title: Subjects offered update + backfill
date: 2026-05-27
---

## Goal

Update Ilithiyana Academics to only offer the 14 subjects shown in “Section C – Registered Subjects for Online Classes”, and backfill existing database rows so legacy subject names/choices are removed or normalized.

## Context

- **Already exists**
  - `lib/curriculum/subjects.ts` defines the canonical tutoring subject labels and which curriculum subjects are offered.
  - Supabase migration `20260525000000_parent_portal.sql` defines `validate_application_payload()` with an older, smaller allowed-subject list.
  - Production data can include legacy subject labels like “Pure Maths”, “Physical Science”, or “English”.
- **Missing**
  - A single canonical offered-subject list matching Section C site-wide.
  - A safe backfill that normalizes legacy labels and removes unoffered choices across `learners`, `applications`, `tutors`, `classes`, and `enrollment_leads`.

## Scope

- **In scope**
  - Update canonical subject options and offered flags in this repo (`ilithiyana`).
  - Add a Supabase migration that backfills and enforces the new allowed list.
- **Out of scope**
  - Any changes in other repos (none required).
  - Reworking report parsing logic beyond subject-name normalization.

## Plan link

- N/A

## Implementation instructions

1. Update `lib/curriculum/subjects.ts`
   - Replace `TUTORING_SUBJECTS` with the 14 allowed subjects:
     - Agricultural Sciences
     - Civil Technology
     - Coding & Robotics
     - Electrical Technology
     - Engineering Graphic Design
     - English (H.L & F.A.L)
     - Life Sciences
     - Mathematics
     - Mechanical Technology
     - Natural Sciences
     - Physical Sciences
     - Technical Mathematics
     - Technical Science
     - Technology
   - Ensure the offered curriculum subjects map to these canonical labels.
2. Add Supabase migration to backfill + enforce
   - Create `normalize_subject_label(text)` to map legacy variants → canonical.
   - Backfill `subjects` arrays on:
     - `learners`, `applications`, `tutors`, `enrollment_leads` (if present)
   - Backfill `classes.subject`.
   - Update `validate_application_payload()` to only accept the 14 subjects (using normalization).
3. Verification
   - Confirm subject dropdowns across onboarding/dashboard now only show the 14 subjects.
   - Run `supabase db push` to apply the migration.
   - Create a test enrollment lead/application using a legacy label (e.g. “Pure Maths”) and ensure it is accepted and stored as “Mathematics”.

## Acceptance

- The UI only shows the 14 allowed subjects everywhere subjects are selectable.
- The database rejects any new subject outside the 14 allowed subjects.
- Existing rows are backfilled:
  - legacy values are normalized (e.g. “Pure Maths” → “Mathematics”, “Physical Science” → “Physical Sciences”, “English” → “English (H.L & F.A.L)”)
  - unoffered subjects are removed from arrays, and `classes.subject` is forced into the allowed set.

