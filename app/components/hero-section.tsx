import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { brand } from '@/lib/site-config';

export function HeroSection() {
  return (
    <section className='relative overflow-hidden bg-white font-sans'>
      <div
        className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[hsl(210,55%,96%)] md:h-96 md:w-96'
        aria-hidden
      />

      <div className='container relative mx-auto grid min-h-[min(88vh,720px)] items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-20'>
        <div className='space-y-6'>
          <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(210,100%,25%)]/70'>
            {brand.name}
          </p>
          <h1 className='font-display text-[34px] font-normal leading-tight text-[hsl(210,100%,25%)] md:text-[40px]'>
            Online tutoring for{' '}
            <em className='not-italic text-primary'>Grades 6–12</em>
          </h1>
          <p className='max-w-lg text-lg text-muted-foreground'>
            {brand.tagline} — small-group sessions in Pure Maths, Sciences, and
            English with subject specialists and scheduling that fits the school
            week.
          </p>
          <div className='flex flex-wrap gap-3 pt-2'>
            <Button
              asChild
              size='lg'
              className='rounded-full bg-primary px-8 text-white hover:bg-primary/90'
            >
              <Link href='/apply-now'>Apply now</Link>
            </Button>
            <Button
              asChild
              size='lg'
              variant='outline'
              className='rounded-full border-primary text-primary hover:bg-[hsl(210,55%,96%)]'
            >
              <Link href='/about'>About Ilithiyana</Link>
            </Button>
          </div>
        </div>

        <div className='relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[hsl(214,32%,91%)]'>
          <Image
            src='/premium-lecturer-and-student-looking-at-paper-next-to-board.jpg'
            alt='Tutor supporting a learner during an online lesson'
            fill
            className='object-cover'
            priority
            quality={75}
            sizes='(max-width: 768px) 100vw, 50vw'
          />
        </div>
      </div>
    </section>
  );
}
