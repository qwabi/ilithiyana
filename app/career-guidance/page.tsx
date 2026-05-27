import Link from 'next/link';
import type { Metadata } from 'next';
import { brand } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';
import { CareerGuidanceSection } from '@/app/components/career-guidance-section';
import { LeadMagnetPromo } from '@/app/components/lead-magnet/LeadMagnetPromo';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = pageMetadata({
  title: 'Career Guidance',
  description: `Weekly career guidance for Ilithiyana Academics learners — university applications, subject choices, bursaries, and life-after-school planning included in every package.`,
  path: '/career-guidance',
});

export default function CareerGuidancePage() {
  return (
    <div className='font-sans'>
      <div className='container mx-auto max-w-3xl px-4 pt-12 md:pt-16'>
        <h1 className='font-display mb-4 text-4xl text-[hsl(210,100%,25%)] md:text-5xl'>
          Career guidance
        </h1>
        <p className='mb-8 text-lg text-muted-foreground'>
          Included in every {brand.name} subscription — not an optional extra.
        </p>
      </div>
      <CareerGuidanceSection showResources id='career-guidance-content' />
      <LeadMagnetPromo />
      <div className='container mx-auto px-4 pb-16 text-center'>
        <Button
          asChild
          size='lg'
          className='rounded-full bg-primary px-8 text-white hover:bg-primary/90'
        >
          <Link href='/apply-now'>Apply with career guidance included</Link>
        </Button>
      </div>
    </div>
  );
}
