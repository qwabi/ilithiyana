import Link from 'next/link';
import type { CompetitorProfile } from '@/lib/competitors';
import {
  competitors,
  getComparisonRowsFor,
  getRelatedCompetitors,
  ilithiyanaProfile,
} from '@/lib/competitors';
import { brand } from '@/lib/site-config';
import { ComparisonTable } from './ComparisonTable';
import { ComparisonCta } from './ComparisonCta';
import { CompetitorFaq } from './CompetitorFaq';
import { FaqJsonLd, buildDefaultFaqs } from './FaqJsonLd';
import { RelatedComparisons } from './RelatedComparisons';

type AlternativePageContentProps = {
  competitor: CompetitorProfile;
};

const criteria = [
  'Consistency — same tutor and weekly slot, not a new search each term',
  'Attention — max 3 learners per session on CAPS Maths and Sciences',
  'Career guidance — university, subjects, and bursaries included',
  'Managed admin — Ilithiyana assigns tutor and agrees times with you',
  'Registered provider — Ilithiyana (Pty) Ltd, POPIA compliant onboarding',
];

export function AlternativePageContent({
  competitor,
}: AlternativePageContentProps) {
  const rows = getComparisonRowsFor(competitor.slug);
  const related = getRelatedCompetitors(competitor.slug);
  const faqs = buildDefaultFaqs(competitor.name, [
    ...competitor.faq,
    {
      question: `How is ${brand.name} different from other ${competitor.typeLabel}s?`,
      answer: `${brand.name} is not a directory — you enrol once into a CAPS programme with fixed ratios, included career guidance, and term reports.`,
    },
  ]);

  const otherOptions = competitors
    .filter((c) => c.slug !== competitor.slug)
    .slice(0, 5);

  return (
    <div className='font-sans'>
      <FaqJsonLd faqs={faqs} />
      <div className='container mx-auto max-w-3xl px-4 py-12 md:py-16'>
        <p className='text-xs font-semibold uppercase tracking-widest text-primary'>
          Alternatives · South Africa
        </p>
        <h1 className='font-display mt-3 text-3xl text-[hsl(210,100%,25%)] md:text-4xl lg:text-5xl'>
          Best {competitor.name} alternative for Grades 6–12
        </h1>
        <p className='mt-4 text-lg leading-relaxed text-muted-foreground'>
          {competitor.alternativeIntro}
        </p>
      </div>

      <div className='container mx-auto max-w-4xl px-4 pb-16'>
        <section className='mb-12'>
          <h2 className='font-display mb-4 text-2xl text-[hsl(210,100%,25%)]'>
            Why parents look for a {competitor.name} alternative
          </h2>
          <ul className='space-y-3'>
            {competitor.whyPeopleSwitch.map((item) => (
              <li
                key={item}
                className='flex gap-3 text-sm text-muted-foreground md:text-base'
              >
                <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary' />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className='mb-12 rounded-2xl border border-[hsl(214,32%,91%)] bg-white p-6 md:p-8'>
          <h2 className='font-display mb-3 text-2xl text-[hsl(210,100%,25%)]'>
            {brand.name} as your alternative
          </h2>
          <p className='mb-4 text-muted-foreground'>{competitor.vsSummary}</p>
          <ul className='mb-6 list-inside list-disc space-y-2 text-sm text-muted-foreground'>
            {ilithiyanaProfile.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <Link
            href='/apply-now'
            className='text-sm font-semibold text-primary hover:underline'
          >
            Apply now →
          </Link>
        </section>

        <section className='mb-12'>
          <h2 className='font-display mb-4 text-2xl text-[hsl(210,100%,25%)]'>
            What to look for in any alternative
          </h2>
          <ul className='grid gap-3 sm:grid-cols-2'>
            {criteria.map((item) => (
              <li
                key={item}
                className='rounded-lg border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)] px-4 py-3 text-sm text-muted-foreground'
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className='mb-12'>
          <h2 className='font-display mb-4 text-2xl text-[hsl(210,100%,25%)]'>
            {brand.name} vs {competitor.name}
          </h2>
          <ComparisonTable rows={rows} competitorName={competitor.name} />
          <p className='mt-4 text-sm'>
            <Link
              href={`/vs/${competitor.slug}`}
              className='text-primary hover:underline'
            >
              Full comparison: {brand.name} vs {competitor.name}
            </Link>
          </p>
        </section>

        <section className='mb-12'>
          <h2 className='font-display mb-4 text-2xl text-[hsl(210,100%,25%)]'>
            Other options parents consider
          </h2>
          <p className='mb-6 text-sm text-muted-foreground'>
            A helpful alternatives page includes real choices — not only our
            product. Here are other providers families compare (links go to their
            sites).
          </p>
          <ul className='space-y-4'>
            {otherOptions.map((c) => (
              <li
                key={c.slug}
                className='rounded-xl border border-[hsl(214,32%,91%)] bg-white p-4'
              >
                <div className='flex flex-wrap items-baseline justify-between gap-2'>
                  <h3 className='font-semibold text-foreground'>
                    <a
                      href={c.website}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='hover:text-primary'
                    >
                      {c.name}
                    </a>
                  </h3>
                  <span className='text-xs text-muted-foreground'>
                    {c.typeLabel}
                  </span>
                </div>
                <p className='mt-2 text-sm text-muted-foreground'>{c.model}</p>
                <Link
                  href={`/alternatives/${c.slug}`}
                  className='mt-2 inline-block text-xs text-primary hover:underline'
                >
                  {c.name} alternatives on our site
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className='mb-12 grid gap-6 md:grid-cols-2'>
          <article className='rounded-xl border border-[hsl(214,32%,91%)] p-5'>
            <h3 className='font-display mb-2 text-lg text-[hsl(210,100%,25%)]'>
              Choose {brand.name} if…
            </h3>
            <ul className='list-inside list-disc text-sm text-muted-foreground'>
              <li>You want CAPS Maths/Sciences with career guidance included</li>
              <li>You are tired of managing tutors yourself</li>
              <li>You are in any province and need fully online classes</li>
            </ul>
          </article>
          <article className='rounded-xl border border-[hsl(214,32%,91%)] p-5'>
            <h3 className='font-display mb-2 text-lg text-[hsl(210,100%,25%)]'>
              Stay with {competitor.name} if…
            </h3>
            <ul className='list-inside list-disc text-sm text-muted-foreground'>
              {competitor.bestFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <ComparisonCta />
        <CompetitorFaq competitor={competitor} />
        <RelatedComparisons related={related} currentSlug={competitor.slug} />
      </div>
    </div>
  );
}
