import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { brand, contact, footerLinks } from '@/lib/site-config';

const Footer = () => {
  return (
    <footer className='bg-[hsl(var(--primary-dark))] py-12 text-primary-foreground'>
      <div className='container mx-auto px-4'>
        <div className='flex flex-wrap justify-between gap-8'>
          <div className='w-full md:w-1/4'>
            <h3 className='font-display mb-3 text-2xl'>
              <span className='text-primary-foreground'>Ilithiyana</span>{' '}
              <span className='text-secondary'>Academics</span>
            </h3>
            <p className='mb-2 text-sm text-primary-foreground/80'>
              {brand.tagline}
            </p>
            <p className='text-sm text-primary-foreground/70'>
              Registration Number: {brand.registrationNumber}
            </p>
          </div>

          <div className='w-full md:w-1/4'>
            <h4 className='mb-4 text-sm font-semibold uppercase tracking-wide text-primary-foreground'>
              Quick Links
            </h4>
            <ul className='space-y-2 text-sm'>
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-primary-foreground/80 transition-colors hover:text-secondary'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className='w-full md:w-1/4'>
            <h4 className='mb-4 text-sm font-semibold uppercase tracking-wide text-primary-foreground'>
              Contact Us
            </h4>
            <div className='space-y-3 text-sm'>
              <p className='flex items-center'>
                <Mail className='mr-2 h-4 w-4 shrink-0 text-secondary' />
                <a
                  href={`mailto:${contact.email}`}
                  className='text-primary-foreground/80 transition-colors hover:text-secondary'
                >
                  {contact.email}
                </a>
              </p>
              <p className='flex items-center'>
                <Phone className='mr-2 h-4 w-4 shrink-0 text-secondary' />
                <a
                  href={`tel:${contact.phoneTel}`}
                  className='text-primary-foreground/80 transition-colors hover:text-secondary'
                >
                  {contact.phone}
                </a>
              </p>
            </div>
          </div>

        </div>

        <div className='mt-10 border-t border-primary-foreground/15 pt-6 text-center text-sm text-primary-foreground/70'>
          <p>
            &copy; {new Date().getFullYear()} {brand.legalName}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
