'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { LogoutButton } from '@/app/components/auth/LogoutButton';
import { brand } from '@/lib/site-config';

/** Compact header for onboarding and payment flows (marketing navbar hidden). */
export function AppFlowHeader() {
  return (
    <header className='sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm'>
      <div className='mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6'>
        <Link
          href='/'
          className='flex items-center gap-2 text-[hsl(210,100%,25%)] hover:opacity-90'
        >
          <GraduationCap className='h-5 w-5 text-[hsl(210,100%,35%)]' />
          <span className='[font-family:var(--font-dm-serif),serif] text-lg'>
            {brand.name}
          </span>
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
