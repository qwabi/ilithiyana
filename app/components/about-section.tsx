import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { brand, positioning } from '@/lib/site-config';

export function AboutSection() {
  return (
    <section className='relative overflow-hidden bg-primary-light py-24 font-sans'>

      {/* Faint watermark */}
      <svg
        viewBox='0 0 200 160'
        aria-hidden
        className='pointer-events-none absolute -right-10 top-1/2 h-[380px] w-[480px] -translate-y-1/2 text-primary opacity-[0.05]'
      >
        <path
          fill='currentColor'
          d='M100 8 L8 48 L100 88 L192 48 Z M36 64 L36 112 C36 128 64 144 100 144 C136 144 164 128 164 112 L164 64 L100 96 Z'
        />
      </svg>

      <div className='container relative z-10 mx-auto px-4'>
        <div className='grid items-center gap-14 md:grid-cols-2'>

          {/* Photo side */}
          <div className='relative'>
            <div className='absolute -inset-4 rounded-[2.5rem] bg-white opacity-60' />
            <div className='relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border-4 border-white shadow-2xl'>
              <Image
                src='/students-happy-sharing-notes.jpg'
                alt='Learners collaborating during a tutoring session'
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 50vw'
              />
            </div>
            {/* Founder badge */}
            <div className='absolute -bottom-4 -right-4 z-10 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg'>
              <div className='h-10 w-10 overflow-hidden rounded-full border-2 border-secondary'>
                <Image
                  src='/Masande.jpg'
                  alt='Masande Dudula, founder'
                  width={40}
                  height={40}
                  className='object-cover'
                />
              </div>
              <div>
                <p className='text-sm font-bold text-foreground'>Masande Dudula</p>
                <p className='text-xs text-muted-foreground'>Founder</p>
              </div>
            </div>
          </div>

          {/* Text side */}
          <div className='space-y-6'>
            <p className='overline text-primary'>Our story</p>
            <h2 className='font-display text-3xl text-primary-dark md:text-4xl'>
              About {brand.name}
            </h2>
            <p className='text-lg leading-relaxed text-muted-foreground'>
              {brand.name} helps South African learners in Grades 6–12 build
              real confidence in key subjects through structured online tutoring.
              Founded by Masande Dudula, the focus has always been on accessible,
              high-quality support — not scattered PDFs and WhatsApp threads.
            </p>
            <p className='text-lg leading-relaxed text-muted-foreground'>
              Classes run in small groups ({positioning.ratio}) so every learner
              gets the attention they deserve. {positioning.intake}
            </p>

            {/* Highlight chips */}
            <div className='flex flex-wrap gap-2 pt-2'>
              {[
                { label: 'Black-owned', bg: 'bg-primary text-white' },
                { label: 'Reg. 2020/652431/07', bg: 'bg-white text-primary border border-border' },
                { label: 'POPIA compliant', bg: 'bg-accent-light text-accent-dark' },
              ].map(({ label, bg }) => (
                <span key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${bg}`}>
                  {label}
                </span>
              ))}
            </div>

            <Button
              asChild
              variant='outline'
              className='rounded-full border-2 border-primary text-primary hover:bg-white'
            >
              <Link href='/about'>Learn more about us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
