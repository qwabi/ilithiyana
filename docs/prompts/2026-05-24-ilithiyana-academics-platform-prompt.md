# Implementation prompt: Ilithiyana Academics platform

## Goal

Ship Ilithiyana Academics as the only public offering on ilithiyana.co.za, with online applications stored in Supabase, admin CRM, PayFast payments, email reminders, and tutor timesheet approval.

## Context

- **Exists:** Next.js 14 site with multi-service pages, `AcademicsForm`, Vercel Blob submissions, basic admin.
- **Missing:** Academics-only IA, `/apply-now`, Supabase schema, uploads, payments, reminders, role portals.
- **Meeting docs:** `docs/context/meeting summary.md`, `meeting_summary_citations.md`.

## Scope

- **In:** Home, About, Contact, Apply Now; redirects; Supabase; admin filters/export; PayFast; Resend; parent/tutor read-only + timesheet submit.
- **Out:** Google Meet API automation, WhatsApp automation, SMEasy integration (future).

## Plan link

[docs/plans/2026-05-24-ilithiyana-academics-platform.md](../plans/2026-05-24-ilithiyana-academics-platform.md)

## Implementation instructions

1. Read `lib/site-config.ts` before editing copy or form options.
2. Apply `supabase/migrations/20260524000000_initial_schema.sql` to the Supabase project.
3. Wire `.env` from `.env.example`.
4. Wave 1: Remove fleet/infrastructure routes; update shell and public pages; `submit_application` RPC from Apply Now.
5. Wave 2: PayFast ITN route; subscription + reminder cron; approval actions; parent/tutor pages.
6. Wave 3: POPIA notice on Apply Now; `npm run build`; verify redirects.

## Acceptance

- [ ] Only academics copy on public site; legacy URLs redirect.
- [ ] Apply Now saves to Supabase with report + payment proof URLs.
- [ ] Admin filters/exports applications; approves/rejects.
- [ ] PayFast webhook updates payment/subscription status.
- [ ] Resend sends due subscription reminders.
- [ ] Tutors submit timesheets; admin approves.
- [ ] `npm run build` passes on `staging`.
