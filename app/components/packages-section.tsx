import Link from 'next/link';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onboardingStartPath, packages, sessionInfo } from '@/lib/site-config';

export function PackagesSection() {
  return (
    <section className='bg-primary-light py-24 font-sans'>
      <div className='container mx-auto px-4'>

        {/* Heading */}
        <div className='mb-14 text-center'>
          <p className='overline mb-3 text-primary'>Simple, honest pricing</p>
          <h2 className='font-display text-3xl text-primary-dark md:text-4xl'>
            Choose what works{' '}
            <em className='not-italic text-secondary'>for your family</em>
          </h2>
          <p className='mx-auto mt-3 max-w-lg text-muted-foreground'>
            Monthly support or pay-per-lesson — career guidance included in both.
          </p>
        </div>

        {/* Cards */}
        <div className='mx-auto grid max-w-3xl gap-6 md:grid-cols-2'>

          {/* Package A — recommended, more prominent */}
          <article className='relative overflow-hidden rounded-2xl border-2 border-primary bg-white shadow-lg'>
            {/* Recommended badge */}
            <div className='absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl bg-secondary px-4 py-1.5'>
              <span className='flex items-center gap-1 text-xs font-bold text-secondary-foreground'>
                <Star className='h-3 w-3 fill-current' /> Recommended
              </span>
            </div>

            {/* Header */}
            <div className='bg-primary-light px-6 pb-4 pt-7'>
              <h3 className='font-display text-2xl text-primary-dark'>{packages[0].name}</h3>
              <p className='mt-1 font-display text-3xl text-primary'>{packages[0].price}</p>
              <p className='mt-1 text-xs text-muted-foreground'>per learner per month</p>
            </div>

            {/* Features */}
            <ul className='space-y-3 px-6 py-6'>
              {packages[0].features.map((f) => (
                <li key={f} className='flex items-start gap-3 text-sm'>
                  <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary'>
                    <Check className='h-3 w-3 text-white' strokeWidth={3} />
                  </span>
                  <span className='text-foreground'>{f}</span>
                </li>
              ))}
              <li className='flex items-start gap-3 text-sm'>
                <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary'>
                  <Check className='h-3 w-3 text-secondary-foreground' strokeWidth={3} />
                </span>
                <span className='text-foreground'>Weekly career guidance sessions</span>
              </li>
            </ul>

            <div className='px-6 pb-6'>
              <Button
                asChild
                className='w-full rounded-full bg-primary font-bold text-white hover:bg-primary/90'
              >
                <Link href={onboardingStartPath}>Choose Package A</Link>
              </Button>
            </div>
          </article>

          {/* Package B */}
          <article className='overflow-hidden rounded-2xl border border-border bg-white'>
            {/* Header */}
            <div className='bg-accent-light px-6 py-5'>
              <span className='mb-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white'>
                Exam prep
              </span>
              <h3 className='font-display text-2xl text-primary-dark'>{packages[1].name}</h3>
              <p className='mt-1 font-display text-3xl text-accent-dark'>{packages[1].price}</p>
              <p className='mt-1 text-xs text-muted-foreground'>pay per lesson</p>
            </div>

            {/* Features */}
            <ul className='space-y-3 px-6 py-6'>
              {packages[1].features.map((f) => (
                <li key={f} className='flex items-start gap-3 text-sm'>
                  <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light'>
                    <Check className='h-3 w-3 text-accent-dark' strokeWidth={3} />
                  </span>
                  <span className='text-foreground'>{f}</span>
                </li>
              ))}
              <li className='flex items-start gap-3 text-sm'>
                <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-light'>
                  <Check className='h-3 w-3 text-accent-dark' strokeWidth={3} />
                </span>
                <span className='text-foreground'>Weekly career guidance sessions</span>
              </li>
            </ul>

            <div className='px-6 pb-6'>
              <Button
                asChild
                variant='outline'
                className='w-full rounded-full border-2 border-accent text-accent-dark hover:bg-accent-light'
              >
                <Link href={onboardingStartPath}>Choose Package B</Link>
              </Button>
            </div>
          </article>
        </div>

        <p className='mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground'>
          {sessionInfo}
        </p>
      </div>
    </section>
  );
}
