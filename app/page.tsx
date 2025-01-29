'use client';

import { HeroSection } from '@/app/components/hero-section';
import { ServiceCard } from '@/app/components/service-card';
import { StatsSection } from '@/app/components/stats-section';
import { AboutSection } from '@/app/components/about-section';
import { TrustSignalsSection } from '@/app/components/trust-signals-section';
import { GraduationCap, Car, Building } from 'lucide-react';

export default function Home() {
  return (
    <main className='min-h-screen'>
      <HeroSection />

      <AboutSection />

      <section className='py-20 bg-gradient-to-b from-white to-gray-50'>
        <div className='container mx-auto px-4'>
          <h2 className='text-4xl md:text-5xl font-bold text-center mb-4 animate-fade-in'>
            Our Services
          </h2>
          <p className='text-xl text-center text-muted-foreground mb-12 animate-slide-up'>
            Excellence in every sector, impact in every community
          </p>

          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
            <ServiceCard
              title='Academic Excellence'
              description='Comprehensive online tutoring for grades 8-12, focusing on key subjects to ensure student success.'
              icon={GraduationCap}
              image='https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=2070'
            />
            <ServiceCard
              title='Vehicle Care Solutions'
              description='Professional fleet management and mobile car wash services tailored to your needs.'
              icon={Car}
              image='https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=2069'
            />
            <ServiceCard
              title='Infrastructure Development'
              description='Expert civil engineering, project management, and water infrastructure solutions.'
              icon={Building}
              image='https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070'
            />
          </div>
        </div>
      </section>

      <StatsSection />

      <TrustSignalsSection />
    </main>
  );
}
