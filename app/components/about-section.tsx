import Image from 'next/image';
import Link from 'next/link';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { Button } from '@/components/ui/button';
import { brand, positioning } from '@/lib/site-config';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
});

export function AboutSection() {
  return (
    <section className={`bg-[hsl(210,55%,96%)] py-20 ${jakarta.className}`}>
      <div className='container mx-auto px-4'>
        <div className='grid items-center gap-12 md:grid-cols-2'>
          <div className='space-y-6'>
            <h2
              className={`${dmSerif.className} text-3xl text-[hsl(210,100%,25%)] md:text-4xl`}
            >
              About {brand.name}
            </h2>
            <p className='text-lg text-muted-foreground'>
              {brand.name} helps South African learners in Grades 6–12 build
              confidence in key subjects through structured online tutoring.
              Founded by Masande Dudula, we focus on accessible, high-quality
              support for families who want clear progress — not scattered PDFs
              and WhatsApp threads.
            </p>
            <p className='text-lg text-muted-foreground'>
              Classes run in small groups ({positioning.ratio}) so every learner
              gets attention. {positioning.intake}
            </p>
            <Button
              asChild
              variant='outline'
              className='rounded-full border-primary text-primary hover:bg-white'
            >
              <Link href='/about'>Learn more about us</Link>
            </Button>
          </div>
          <div className='relative aspect-[4/3] overflow-hidden rounded-2xl border border-[hsl(214,32%,91%)]'>
            <Image
              src='/students-happy-sharing-notes.jpg'
              alt='Learners collaborating during a tutoring session'
              fill
              className='object-cover'
              sizes='(max-width: 768px) 100vw, 50vw'
            />
          </div>
        </div>
      </div>
    </section>
  );
}
