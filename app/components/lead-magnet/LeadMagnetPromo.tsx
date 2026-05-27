import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUBJECT_CHOICE_MAGNET } from '@/lib/lead-magnets';

type LeadMagnetPromoProps = {
  variant?: 'card' | 'inline';
};

export function LeadMagnetPromo({ variant = 'card' }: LeadMagnetPromoProps) {
  if (variant === 'inline') {
    return (
      <p className='text-center text-sm text-muted-foreground'>
        Not ready to apply?{' '}
        <Link
          href={SUBJECT_CHOICE_MAGNET.path}
          className='font-medium text-primary underline-offset-2 hover:underline'
        >
          Get the free CAPS subject choice checklist
        </Link>
      </p>
    );
  }

  return (
    <section className='bg-[hsl(210,55%,96%)] py-14'>
      <div className='container mx-auto max-w-3xl px-4'>
        <div className='flex flex-col items-center gap-6 rounded-2xl border border-border bg-white p-8 text-center md:p-10'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <ClipboardList className='h-6 w-6' aria-hidden />
          </div>
          <div className='space-y-2'>
            <h2 className='font-display text-2xl text-[hsl(210,100%,25%)] md:text-3xl'>
              Free CAPS subject choice checklist
            </h2>
            <p className='text-muted-foreground'>
              Grades 8–12 parents: choose the right FET subjects before Grade 10
              — plus links to NSFAS and career planning resources.
            </p>
          </div>
          <ul className='mx-auto max-w-md space-y-2 text-left text-sm text-muted-foreground'>
            <li className='flex gap-2'>
              <span className='text-accent'>✓</span>
              Pure Maths vs pathways — what to confirm early
            </li>
            <li className='flex gap-2'>
              <span className='text-accent'>✓</span>
              Printable checklist you can use with your school
            </li>
            <li className='flex gap-2'>
              <span className='text-accent'>✓</span>
              Delivered to your inbox in seconds
            </li>
          </ul>
          <Button
            asChild
            size='lg'
            className='rounded-full bg-primary px-8 text-white hover:bg-primary/90'
          >
            <Link href={SUBJECT_CHOICE_MAGNET.path}>
              Download free checklist
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
