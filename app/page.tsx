import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { FaqSection } from '@/app/components/faq-section';
import { TestimonialsSection } from '@/app/components/testimonials-section';
import { pageMetadata, siteDescription } from '@/lib/seo';
import { HeroSection } from '@/app/components/hero-section';
import { StatsSection } from '@/app/components/stats-section';
import { AboutSection } from '@/app/components/about-section';
import { TrustSignalsSection } from '@/app/components/trust-signals-section';
import { LeadMagnetPromo } from '@/app/components/lead-magnet/LeadMagnetPromo';
import { SubjectStrip } from '@/app/components/subject-strip';
import { HowItWorksSection } from '@/app/components/how-it-works-section';
import { PackagesSection } from '@/app/components/packages-section';
import { CareerGuidanceCallout } from '@/app/components/career-guidance-callout';
import { FinalCta } from '@/app/components/final-cta';
import { brand } from '@/lib/site-config';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = pageMetadata({
  title: brand.tagline,
  description: siteDescription,
  path: '/',
});

export default function Home() {
  return (
    <div className={`min-h-screen ${jakarta.className}`}>
      <HeroSection />
      <SubjectStrip />
      <StatsSection />
      <HowItWorksSection />
      <TrustSignalsSection />
      <PackagesSection />
      <CareerGuidanceCallout />
      <AboutSection />
      <LeadMagnetPromo />
      <TestimonialsSection />
      <FaqSection />
      <FinalCta />
    </div>
  );
}
