# Ilithiyana Academics platform

See the approved plan in Cursor plans (`ilithiyana_academics_rebrand`). This file is the repo-local copy for agents and developers.

## Goal

Rebrand ilithiyana.co.za as **Ilithiyana Academics only** and deliver the full tutoring platform: public site (Home, About, Contact, Apply Now), Supabase CRM, PayFast payments, Resend reminders, and admin/tutor/parent workflows.

## Locked decisions

- Nav: Home, About, Apply Now, Contact — no separate Academics nav.
- `/academics` → `/apply-now` (301).
- `/vehicle-care` and `/infrastructure` → `/` (301).
- Subjects: Pure Maths, Natural Sciences, Life Sciences, English, Physical Science.
- Grades: 6–12.

## Waves

1. **Wave 1:** Schema, decommission legacy, shell, pages, apply → Supabase, admin applications CRM, SEO.
2. **Wave 2:** PayFast, subscriptions, Resend reminders, approval emails, parent/tutor portals, timesheets, scheduling.
3. **Wave 3:** POPIA copy, remove Blob academics path, staging verification.

## Shared contract

All copy and form options: [`lib/site-config.ts`](../../lib/site-config.ts).
