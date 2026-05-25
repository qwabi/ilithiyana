'use client';

import { useEffect, useRef } from 'react';

export function PayFastRedirectForm({
  action,
  fields,
}: {
  action: string;
  fields: Record<string, string>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} method='POST' action={action} className='hidden'>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type='hidden' name={name} value={value} />
      ))}
    </form>
  );
}
