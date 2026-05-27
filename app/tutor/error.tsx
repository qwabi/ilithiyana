'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function TutorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className='mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center'>
      <h1 className='[font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)]'>
        Something went wrong
      </h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        We could not load this page. Try again or return to the tutor home.
      </p>
      <div className='mt-6 flex gap-3'>
        <Button variant='outline' onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <a href='/tutor/signup'>Tutor home</a>
        </Button>
      </div>
    </div>
  );
}
