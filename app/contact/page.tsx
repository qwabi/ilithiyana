import ContactForm from '../components/ContactForm';
import { contact, brand } from '@/lib/site-config';
import { Mail, Phone, MessageCircle } from 'lucide-react';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = pageMetadata({
  title: 'Contact',
  description: `Get in touch with ${brand.name} — email, phone, or WhatsApp.`,
  path: '/contact',
});

const contactChannels = [
  {
    title: 'Email',
    icon: Mail,
    href: `mailto:${contact.email}`,
    label: contact.email,
    border: 'border-t-primary',
  },
  {
    title: 'Phone',
    icon: Phone,
    href: `tel:${contact.phoneTel}`,
    label: contact.phone,
    border: 'border-t-accent',
  },
  {
    title: 'WhatsApp',
    icon: MessageCircle,
    href: contact.whatsapp,
    label: 'Chat on WhatsApp',
    border: 'border-t-[hsl(199,100%,62%)]',
    external: true,
  },
] as const;

export default function ContactPage() {
  return (
    <div className={`container mx-auto px-4 py-12 md:py-16 ${jakarta.className}`}>
      <header className='mb-10 max-w-2xl'>
        <h1
          className={`${dmSerif.className} mb-3 text-4xl text-[hsl(210,100%,25%)] md:text-5xl`}
        >
          Contact us
        </h1>
        <p className='text-lg text-muted-foreground'>
          We would love to hear from you. Send a message using the form, or reach{' '}
          {brand.name} directly by email, phone, or WhatsApp.
        </p>
        <p className='mt-3 text-sm text-muted-foreground'>
          {brand.legalName} ({brand.registrationNumber}) · Fully online tutoring
          for families across all nine South African provinces. No physical
          classroom — sessions run on Google Meet.
        </p>
      </header>

      <div className='grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12'>
        <div className='space-y-4'>
          {contactChannels.map((channel) => (
            <article
              key={channel.title}
              className={`rounded-xl border border-[hsl(214,32%,91%)] border-t-4 bg-white p-5 ${channel.border}`}
            >
              <h2 className='mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
                <channel.icon className='h-5 w-5 text-primary' aria-hidden />
                {channel.title}
              </h2>
              <a
                href={channel.href}
                className='text-lg font-medium text-primary hover:underline'
                {...('external' in channel && channel.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {channel.label}
              </a>
            </article>
          ))}
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
