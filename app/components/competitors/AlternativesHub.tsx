import Link from 'next/link';
import { competitors } from '@/lib/competitors';
import { brand } from '@/lib/site-config';
import { ComparisonCta } from './ComparisonCta';

const tierLabels: Record<1 | 2 | 3, string> = {
  1: 'Most compared',
  2: 'Structured programmes',
  3: 'Directories & regional listings',
};

export function AlternativesHub() {
  const tiers = [1, 2, 3] as const;

  return (
    <div className='font-sans'>
      <div className='container mx-auto max-w-3xl px-4 py-12 md:py-16'>
        <h1 className='font-display text-3xl text-[hsl(210,100%,25%)] md:text-4xl lg:text-5xl'>
          Tutoring alternatives in South Africa
        </h1>
        <p className='mt-4 text-lg text-muted-foreground'>
          Honest comparisons between {brand.name} and other tutoring options
          parents research — marketplaces, franchises, premium 1-on-1, and
          Eastern Cape directories.
        </p>
      </div>

      <div className='container mx-auto max-w-4xl px-4 pb-16'>
        <section className='mb-12 rounded-2xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)] p-6'>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            How {brand.name} fits
          </h2>
          <p className='text-sm text-muted-foreground'>
            Managed online CAPS programme · {brand.name} caps groups at 3
            learners · Career guidance included · Grades 6–12 · Apply through
            ilithiyana.co.za
          </p>
        </section>

        {tiers.map((tier) => {
          const group = competitors.filter((c) => c.priority === tier);
          return (
            <section key={tier} className='mb-10'>
              <h2 className='font-display mb-4 text-xl text-[hsl(210,100%,25%)]'>
                {tierLabels[tier]}
              </h2>
              <ul className='grid gap-4 sm:grid-cols-2'>
                {group.map((c) => (
                  <li
                    key={c.slug}
                    className='flex flex-col rounded-xl border border-[hsl(214,32%,91%)] bg-white p-5'
                  >
                    <h3 className='font-semibold text-foreground'>{c.name}</h3>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {c.typeLabel}
                    </p>
                    <p className='mt-3 flex-1 text-sm text-muted-foreground'>
                      {c.vsSummary.length > 150
                        ? `${c.vsSummary.slice(0, 150)}…`
                        : c.vsSummary}
                    </p>
                    <div className='mt-4 flex flex-wrap gap-2'>
                      <Link
                        href={`/alternatives/${c.slug}`}
                        className='text-sm font-medium text-primary hover:underline'
                      >
                        Alternatives
                      </Link>
                      <span className='text-muted-foreground'>·</span>
                      <Link
                        href={`/vs/${c.slug}`}
                        className='text-sm font-medium text-primary hover:underline'
                      >
                        Compare
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <ComparisonCta />
      </div>
    </div>
  );
}
