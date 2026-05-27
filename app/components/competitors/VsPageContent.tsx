import Link from 'next/link';
import type { CompetitorProfile } from '@/lib/competitors';
import {
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

type VsPageContentProps = {
  competitor: CompetitorProfile;
};

export function VsPageContent({ competitor }: VsPageContentProps) {
  const rows = getComparisonRowsFor(competitor.slug);
  const related = getRelatedCompetitors(competitor.slug);
  const faqs = buildDefaultFaqs(competitor.name, competitor.faq);

  return (
    <div className='font-sans'>
      <FaqJsonLd faqs={faqs} />
      <div className='container mx-auto max-w-3xl px-4 py-12 md:py-16'>
        <p className='text-xs font-semibold uppercase tracking-widest text-primary'>
          Comparison · {brand.name}
        </p>
        <h1 className='font-display mt-3 text-3xl text-[hsl(210,100%,25%)] md:text-4xl lg:text-5xl'>
          {brand.name} vs {competitor.name}
        </h1>
        <p className='mt-4 text-lg leading-relaxed text-muted-foreground'>
          {competitor.vsSummary}
        </p>
        <p className='mt-4 text-sm text-muted-foreground'>
          {competitor.typeLabel} ·{' '}
          <a
            href={competitor.website}
            target='_blank'
            rel='noopener noreferrer'
            className='text-primary hover:underline'
          >
            {competitor.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
          </a>
        </p>
      </div>

      <div className='container mx-auto max-w-4xl px-4 pb-16'>
        <section className='mb-12'>
          <h2 className='font-display mb-4 text-2xl text-[hsl(210,100%,25%)]'>
            At a glance
          </h2>
          <ComparisonTable rows={rows} competitorName={competitor.name} />
        </section>

        <section className='mb-12 space-y-8'>
          <div>
            <h2 className='font-display mb-3 text-2xl text-[hsl(210,100%,25%)]'>
              Programme model
            </h2>
            <p className='text-muted-foreground'>
              <strong className='text-foreground'>{brand.name}</strong> is a{' '}
              {ilithiyanaProfile.model.toLowerCase()}: {ilithiyanaProfile.ratio},
              tutor assigned, recurring weekly times agreed with your family, and
              term reports on progress.{' '}
              <strong className='text-foreground'>{competitor.name}</strong> is a{' '}
              {competitor.typeLabel.toLowerCase()} — {competitor.model}.
            </p>
          </div>

          <div>
            <h2 className='font-display mb-3 text-2xl text-[hsl(210,100%,25%)]'>
              Pricing
            </h2>
            <p className='text-muted-foreground'>
              {brand.name}: {ilithiyanaProfile.pricing}. {competitor.name}:{' '}
              {competitor.pricingSummary}. For regular support, compare total
              monthly cost — not only the lowest hourly rate.
            </p>
          </div>

          <div>
            <h2 className='font-display mb-3 text-2xl text-[hsl(210,100%,25%)]'>
              Career guidance
            </h2>
            <p className='text-muted-foreground'>
              Weekly career guidance (university applications, subject choices,
              bursaries) is included in every {brand.name} package.{' '}
              {competitor.name} does not offer an equivalent as part of a standard
              enrolment.
            </p>
          </div>
        </section>

        <section className='mb-12 grid gap-6 md:grid-cols-2'>
          <article className='rounded-xl border border-t-4 border-t-primary border-[hsl(214,32%,91%)] bg-white p-6'>
            <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
              Who {brand.name} is best for
            </h2>
            <ul className='list-inside list-disc space-y-2 text-sm text-muted-foreground'>
              <li>Grades 6–12 on CAPS needing Maths or Sciences support</li>
              <li>Parents wanting a managed schedule, not hourly coordination</li>
              <li>Families in any province — fully online</li>
              <li>Parents who want career guidance without a separate provider</li>
            </ul>
          </article>
          <article className='rounded-xl border border-t-4 border-t-secondary border-[hsl(214,32%,91%)] bg-white p-6'>
            <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
              Who {competitor.name} is best for
            </h2>
            <ul className='list-inside list-disc space-y-2 text-sm text-muted-foreground'>
              {competitor.bestFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className='mt-4 text-xs text-muted-foreground'>
              We acknowledge when another model fits better — choosing honestly
              builds trust.
            </p>
          </article>
        </section>

        {competitor.whyPeopleSwitch.length > 0 && (
          <section className='mb-12'>
            <h2 className='font-display mb-4 text-2xl text-[hsl(210,100%,25%)]'>
              Why families leave {competitor.name}
            </h2>
            <ul className='space-y-3'>
              {competitor.whyPeopleSwitch.map((item) => (
                <li
                  key={item}
                  className='rounded-lg border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)] px-4 py-3 text-sm text-muted-foreground'
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className='mb-12'>
          <h2 className='font-display mb-4 text-2xl text-[hsl(210,100%,25%)]'>
            Switching to {brand.name}
          </h2>
          <ol className='list-inside list-decimal space-y-2 text-muted-foreground'>
            {ilithiyanaProfile.migrationSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className='mt-4 text-sm'>
            Also read:{' '}
            <Link
              href={`/alternatives/${competitor.slug}`}
              className='text-primary hover:underline'
            >
              {competitor.name} alternatives
            </Link>
          </p>
        </section>

        <ComparisonCta />
        <CompetitorFaq competitor={competitor} />
        <RelatedComparisons related={related} currentSlug={competitor.slug} />
      </div>
    </div>
  );
}
