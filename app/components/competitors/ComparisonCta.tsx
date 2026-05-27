import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { contact } from '@/lib/site-config';

export function ComparisonCta() {
  return (
    <section className='rounded-2xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)] px-6 py-10 text-center'>
      <h2 className='font-display mb-3 text-2xl text-[hsl(210,100%,25%)] md:text-3xl'>
        Ready for a managed programme?
      </h2>
      <p className='mx-auto mb-6 max-w-xl text-muted-foreground'>
        Apply online — we assign your tutor, agree session times around school,
        and include career guidance in every package.
      </p>
      <div className='flex flex-wrap justify-center gap-3'>
        <Button
          asChild
          size='lg'
          className='rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90'
        >
          <Link href='/apply-now'>Apply now</Link>
        </Button>
        <Button
          asChild
          variant='outline'
          size='lg'
          className='rounded-full border-primary text-primary hover:bg-white'
        >
          <Link href='/contact'>Contact us</Link>
        </Button>
        <Button
          asChild
          variant='ghost'
          size='lg'
          className='rounded-full text-primary'
        >
          <a href={contact.whatsapp} target='_blank' rel='noopener noreferrer'>
            WhatsApp
          </a>
        </Button>
      </div>
    </section>
  );
}
