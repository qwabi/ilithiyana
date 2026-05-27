'use client';

import { Clock } from 'lucide-react';

export function TutorVettingPendingClock() {
  return (
    <Clock
      className='mb-4 h-12 w-12 spin-slow text-amber-500'
      aria-hidden
    />
  );
}
