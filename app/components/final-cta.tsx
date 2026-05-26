import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LeadMagnetPromo } from '@/app/components/lead-magnet/LeadMagnetPromo';
import { brand, grades, onboardingStartPath } from '@/lib/site-config';

export function FinalCta() {
  const gradeRange = `Grades ${grades[0]}–${grades[grades.length - 1]}`;

  return (
    <section className='relative overflow-hidden bg-primary py-24 font-sans'>

      {/* Background blobs */}
      <div className='pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/5' aria-hidden />
      <div className='pointer-events-none absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-secondary/20' aria-hidden />
      <div className='pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-accent/20' aria-hidden />

      <div className='container relative z-10 mx-auto px-4 text-center'>

        {/* Eyebrow */}
        <span className='mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/80'>
          <span className='h-2 w-2 animate-pulse rounded-full bg-secondary' />
          Applications open · {gradeRange}
        </span>

        <h2 className='font-display mb-4 text-3xl text-white md:text-5xl'>
          Ready to enrol with{' '}
          <em className='not-italic text-secondary'>{brand.name}</em>?
        </h2>
        <p className='mx-auto mb-10 max-w-xl text-lg text-white/70'>
          {gradeRange} online tutoring — applications are reviewed as they come in.
          No intake dates. Just apply when your child is ready.
        </p>

        <div className='flex flex-wrap justify-center gap-4'>
          <Button
            asChild
            size='lg'
            className='rounded-full bg-secondary px-10 font-bold text-secondary-foreground shadow-lg hover:bg-secondary/90'
          >
            <Link href={onboardingStartPath}>Apply now</Link>
          </Button>
          <Button
            asChild
            size='lg'
            variant='outline'
            className='rounded-full border-2 border-white/40 px-10 text-white hover:bg-white/10'
          >
            <Link href='/about'>About us</Link>
          </Button>
        </div>

        <div className='mt-8'>
          <LeadMagnetPromo variant='inline' />
        </div>
      </div>
    </section>
  );
}
