'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ChecklistPrintActions() {
  return (
    <div className='checklist-no-print mb-8 flex flex-wrap gap-3'>
      <Button
        type='button'
        onClick={() => window.print()}
        className='rounded-full bg-primary text-white hover:bg-primary/90'
      >
        Print / Save as PDF
      </Button>
      <Button
        asChild
        variant='outline'
        className='rounded-full border-primary text-primary'
      >
        <Link href='/apply-now'>Apply for tutoring</Link>
      </Button>
    </div>
  );
}
