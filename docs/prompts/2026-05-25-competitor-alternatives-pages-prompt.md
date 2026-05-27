# Competitor & alternative comparison pages

**Date:** 2026-05-25  
**Plan link:** _(marketing/SEO — no separate plan doc)_

## Goal

Publish honest, SEO-oriented competitor comparison content for Ilithiyana Academics — centralized competitor data, a hub page, per-competitor “alternative” and “vs” routes, FAQ schema, sitemap entries, and footer discovery — so parents evaluating Superprof, Kip McGrath, directories, and premium 1-on-1 options can find structured CAPS programme positioning.

## Context

**Exists:**
- `.agents/product-marketing-context.md` with competitive landscape and pricing reference
- `lib/seo.ts`, `lib/site-config.ts`, marketing page patterns
- No prior `/alternatives` or `/vs` routes

**Missing:**
- Centralized competitor profiles
- Comparison page templates
- Sitemap/footer links for 25 new public URLs

## Scope

**In scope:** `lib/competitors/*`, `app/alternatives/*`, `app/vs/*`, shared components under `app/components/competitors/`, `scripts/generate-sitemap.mjs`, footer link.

**Out of scope:** Programmatic generation at scale beyond listed competitors; competitor-vs-competitor-only pages (no Ilithiyana); live price scraping; testimonial quotes until verified.

## Competitors (12)

Superprof, The Tutor Company, Kip McGrath, Genius Premium Tuition, Tutor Doctor, BrightSparkz, Tutors and Exams, TutorHunt, My Private Tutor, Teach Me 2, Saving Grace Education, TurtleJar.

## Implementation instructions

1. `lib/competitors/types.ts` — profile + comparison types  
2. `lib/competitors/competitors.ts` — all 12 profiles (honest strengths/limitations)  
3. `lib/competitors/ilithiyana.ts` — baseline + `buildComparisonRows`  
4. `lib/competitors/slugs.json` — sitemap slug list (keep in sync when adding competitors)  
5. `app/components/competitors/*` — table, CTA, FAQ, hub, vs/alternative content  
6. `app/alternatives/page.tsx` + `[slug]` with `generateStaticParams`  
7. `app/vs/[slug]/page.tsx` with `generateStaticParams`  
8. Run `node scripts/generate-sitemap.mjs`  
9. Footer: Compare Tutoring Options → `/alternatives`

## Acceptance

- [ ] `/alternatives` lists all 12 competitors in priority tiers  
- [ ] `/alternatives/{slug}` and `/vs/{slug}` render for each slug in `slugs.json`  
- [ ] Each page has unique metadata, comparison table, honest “who it’s for”, FAQ JSON-LD  
- [ ] Sitemap includes hub + 24 competitor URLs (33 routes total with core pages)  
- [ ] Footer link to hub works  
- [ ] Copy uses brand voice (no unverified stats; CAPS Gr 6–12; 1:3; career guidance)

## Maintenance

- Quarterly: verify competitor pricing/positioning on their sites  
- When adding a competitor: update `competitors.ts` and `slugs.json`, re-run sitemap script  
- Add switcher testimonials to migration sections when Masande provides quotes
