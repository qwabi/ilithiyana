import Link from 'next/link';
import { Mail, Phone, GraduationCap } from 'lucide-react';
import { brand, contact, footerLinks } from '@/lib/site-config';

const Footer = () => {
  return (
    <footer className='bg-primary-dark py-14 font-sans text-primary-foreground'>
      <div className='container mx-auto px-4'>
        <div className='flex flex-wrap justify-between gap-10'>

          {/* Brand */}
          <div className='w-full md:w-1/4'>
            <div className='mb-4 flex items-center gap-2'>
              <div className='flex h-9 w-9 items-center justify-center rounded-full bg-primary'>
                <GraduationCap className='h-5 w-5 text-white' />
              </div>
              <span className='font-display text-2xl'>
                <span className='text-white'>Ilithiyana</span>{' '}
                <span className='text-secondary'>Academics</span>
              </span>
            </div>
            <p className='mb-2 text-sm text-primary-foreground/75'>{brand.tagline}</p>
            <p className='text-xs text-primary-foreground/50'>
              Reg. {brand.registrationNumber}
            </p>
          </div>

          {/* Quick links */}
          <div className='w-full md:w-1/4'>
            <h4 className='mb-4 text-xs font-bold uppercase tracking-widest text-primary-foreground/50'>
              Quick Links
            </h4>
            <ul className='space-y-2.5 text-sm'>
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-primary-foreground/70 transition-colors hover:text-secondary'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className='w-full md:w-1/4'>
            <h4 className='mb-4 text-xs font-bold uppercase tracking-widest text-primary-foreground/50'>
              Contact
            </h4>
            <div className='space-y-3 text-sm'>
              <p className='flex items-center gap-2'>
                <Mail className='h-4 w-4 shrink-0 text-secondary' />
                <a
                  href={`mailto:${contact.email}`}
                  className='text-primary-foreground/70 transition-colors hover:text-secondary'
                >
                  {contact.email}
                </a>
              </p>
              <p className='flex items-center gap-2'>
                <Phone className='h-4 w-4 shrink-0 text-secondary' />
                <a
                  href={`tel:${contact.phoneTel}`}
                  className='text-primary-foreground/70 transition-colors hover:text-secondary'
                >
                  {contact.phone}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className='mt-10 border-t border-white/10 pt-6 text-center text-xs text-primary-foreground/40'>
          &copy; {new Date().getFullYear()} {brand.legalName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
