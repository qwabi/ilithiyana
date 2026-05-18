import '@/app/globals.css';
import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { Navbar } from '@/app/components/navbar';
import { CTA } from '@/app/components/cta';
import Footer from '@/app/components/Footer';
import { Toaster } from 'react-hot-toast';
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ilithiyana.co.za"),
  title: {
    default: "Ilithiyana Group | Multi-Service Bookings And CRM Website",
    template: "%s | Ilithiyana Group",
  },
  description: "Ilithiyana Group delivers infrastructure, vehicle care, and academic support services with bookings and CRM workflows.",
  keywords: [
    "Ilithiyana Group",
    "Mthatha services",
    "infrastructure services",
    "vehicle care",
    "academic support"
],
  authors: [{ name: "Ilithiyana Group" }],
  creator: "Ilithiyana Group",
  publisher: "Ilithiyana Group",
  alternates: {
    canonical: "https://ilithiyana.co.za",
  },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: "https://ilithiyana.co.za",
    siteName: "Ilithiyana Group",
    title: "Ilithiyana Group | Multi-Service Bookings And CRM Website",
    description: "Ilithiyana Group delivers infrastructure, vehicle care, and academic support services with bookings and CRM workflows.",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: "Ilithiyana Group social preview",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Ilithiyana Group",
    description: "Ilithiyana Group delivers infrastructure, vehicle care, and academic support services with bookings and CRM workflows.",
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
}

export default function RootLayout({


  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en-ZA'><body className={poppins.variable}>
        <Navbar />
        <Toaster />
        <main className='w-full px-2 md:px-0'>{children}</main>
        <CTA />
        <Footer />
      </body>
    </html>
  );
}

import './globals.css';
