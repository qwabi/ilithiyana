import '@/app/globals.css';
import type { Metadata } from 'next';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/app/components/auth/AuthProvider';
import { ConditionalNavbar } from '@/app/components/ConditionalNavbar';
import Footer from '@/app/components/Footer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { OrganizationJsonLd } from '@/app/components/organization-json-ld';
import { Toaster } from 'react-hot-toast';
import { brand } from '@/lib/site-config';
import { siteDescription } from '@/lib/seo';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: {
    default: `${brand.name} | ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: siteDescription,
  keywords: [
    brand.name,
    'online tutoring South Africa',
    'matric tutoring online',
    'grade 12 maths tutor online',
    'small group online tutoring',
    'Pure Maths tutor',
    'Life Sciences tutor',
    'Physical Science tutor',
  ],
  authors: [{ name: brand.name }],
  creator: brand.name,
  publisher: brand.legalName,
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    siteName: brand.name,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: `${brand.name} — online tutoring for Grades 6–12`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser = null;
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    initialUser = user;
  } catch {
    initialUser = null;
  }

  return (
    <html
      lang='en-ZA'
      className={`${dmSerif.variable} ${plusJakarta.variable}`}
    >
      <body className='font-sans flex min-h-screen flex-col antialiased'>
        <OrganizationJsonLd />
        <AuthProvider initialUser={initialUser}>
          <ConditionalNavbar />
          <Toaster />
          <main className='w-full flex-1 px-2 md:px-0'>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
