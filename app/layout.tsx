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
  title: 'Ilithiyana Group',
  description: "Driving South Africa's Growth through Expertise & Integrity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body className={poppins.variable}>
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
