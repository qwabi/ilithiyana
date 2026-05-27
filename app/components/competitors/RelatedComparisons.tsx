import Link from 'next/link';
import type { CompetitorProfile } from '@/lib/competitors';

type RelatedComparisonsProps = {
  related: CompetitorProfile[];
  currentSlug: string;
};

export function RelatedComparisons({
  related,
  currentSlug,
}: RelatedComparisonsProps) {
  const items = related.filter((c) => c.slug !== currentSlug);
  if (items.length === 0) return null;

  return (
    <section className='mt-12 border-t border-[hsl(214,32%,91%)] pt-10'>
      <h2 className='font-display mb-4 text-xl text-[hsl(210,100%,25%)]'>
        More comparisons
      </h2>
      <ul className='flex flex-wrap gap-2'>
        {items.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/vs/${c.slug}`}
              className='inline-block rounded-full border border-[hsl(214,32%,91%)] bg-white px-4 py-2 text-sm text-primary transition-colors hover:border-primary hover:bg-[hsl(210,55%,96%)]'
            >
              vs {c.name}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href='/alternatives'
            className='inline-block rounded-full border border-primary/30 bg-[hsl(210,55%,96%)] px-4 py-2 text-sm font-medium text-primary'
          >
            All alternatives
          </Link>
        </li>
      </ul>
    </section>
  );
}
