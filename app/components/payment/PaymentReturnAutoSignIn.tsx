'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPassword } from '@/app/actions/auth-actions';

const STORAGE_KEY = 'ilithiyana_enrollment_auth';

type StoredAuth = {
  email: string;
  password: string;
  leadId?: string;
};

type Props = {
  enabled: boolean;
  redirectTo?: string;
};

/** After PayFast return, sign in using credentials saved at apply submit. */
export function PaymentReturnAutoSignIn({
  enabled,
  redirectTo = '/dashboard',
}: Props) {
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (!enabled || attempted.current) return;
    attempted.current = true;

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }

    if (!raw) return;

    let parsed: StoredAuth;
    try {
      parsed = JSON.parse(raw) as StoredAuth;
    } catch {
      return;
    }

    if (!parsed.email || !parsed.password) return;

    void (async () => {
      const result = await signInWithPassword(parsed.email, parsed.password);
      if (result.ok) {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        const target =
          parsed.leadId && redirectTo === '/dashboard'
            ? `/dashboard?lead=${parsed.leadId}`
            : redirectTo;
        router.push(target);
        router.refresh();
      }
    })();
  }, [enabled, redirectTo, router]);

  return null;
}
