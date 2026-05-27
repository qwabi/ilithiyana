'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  requestSubjectChoiceChecklist,
  type ChecklistFormState,
} from '@/app/actions/lead-magnet-actions';

const initialState: ChecklistFormState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type='submit'
      disabled={pending}
      className='mt-6 w-full rounded-full bg-primary text-white hover:bg-primary/90 md:w-auto md:px-10'
    >
      {pending ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          Sending checklist…
        </>
      ) : (
        'Send me the free checklist'
      )}
    </Button>
  );
}

export function SubjectChoiceForm() {
  const [state, formAction] = useFormState(
    requestSubjectChoiceChecklist,
    initialState
  );

  return (
    <form
      action={formAction}
      className='rounded-xl border border-border bg-white p-6 shadow-sm md:p-8'
    >
      <div className='grid gap-4'>
        <div>
          <Label htmlFor='firstName'>First name (optional)</Label>
          <Input
            id='firstName'
            name='firstName'
            type='text'
            autoComplete='given-name'
            className='mt-1'
          />
        </div>
        <div>
          <Label htmlFor='email'>Email address</Label>
          <Input
            id='email'
            name='email'
            type='email'
            autoComplete='email'
            required
            className='mt-1'
          />
        </div>
      </div>

      {state.message ? (
        <p className='mt-4 text-sm text-destructive' role='alert'>
          {state.message}
        </p>
      ) : null}

      <SubmitButton />

      <p className='mt-4 text-xs text-muted-foreground'>
        Free guide via email. We send one message with your checklist link. See
        our{' '}
        <Link href='/privacy' className='text-primary underline'>
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
