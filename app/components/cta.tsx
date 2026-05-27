import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { brand, positioning, onboardingStartPath } from '@/lib/site-config';

export function CTA() {
  return (
    <section className='bg-white py-16'>
      <div className='container mx-auto px-4 text-center'>
        <h2 className='font-display mb-4 text-3xl text-[hsl(var(--primary-dark))] md:text-4xl'>
          Ready to join Ilithiyana Academics?
        </h2>
        <p className='mx-auto mb-8 max-w-2xl text-base text-muted-foreground md:text-lg'>
          {brand.tagline}. Small-group online tutoring with {positioning.ratio}.{' '}
          {positioning.intake}
        </p>
        <Button
          asChild
          variant='secondary'
          size='lg'
          className='rounded-full px-8 font-semibold shadow-none'
        >
          <Link href={onboardingStartPath}>Apply now</Link>
        </Button>
      </div>
    </section>
  );
}
