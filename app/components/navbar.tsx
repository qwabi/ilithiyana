'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { navLinks } from '@/lib/site-config';

const navLinkClass =
  'text-[13px] font-sans text-muted-foreground transition-colors hover:text-primary';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const primaryLinks = navLinks.filter((link) => link.href !== '/apply-now');

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className='fixed top-0 left-0 right-0 z-50 h-20 border-b-[0.5px] border-border bg-white'>
      <div className='container mx-auto px-4'>
        <div className='flex h-20 items-center justify-between'>
          <Link href='/' className='font-display text-xl leading-tight md:text-2xl'>
            <span className='text-[hsl(var(--primary-dark))]'>Ilithiyana</span>{' '}
            <span className='text-primary'>Academics</span>
          </Link>

          <div className='hidden items-center gap-8 md:flex'>
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  navLinkClass,
                  isActive(link.href) && 'font-semibold text-primary'
                )}
              >
                {link.label}
              </Link>
            ))}
            <Button
              asChild
              variant='secondary'
              size='sm'
              className='rounded-full px-5 font-semibold shadow-none'
            >
              <Link href='/apply-now'>Apply now</Link>
            </Button>
          </div>

          <button
            type='button'
            className='md:hidden'
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? (
              <X className='h-6 w-6 text-muted-foreground' />
            ) : (
              <Menu className='h-6 w-6 text-muted-foreground' />
            )}
          </button>
        </div>

        {isOpen && (
          <div className='absolute left-0 right-0 top-full border-b-[0.5px] border-border bg-white p-4 shadow-sm md:hidden'>
            <div className='flex flex-col gap-4'>
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    navLinkClass,
                    isActive(link.href) && 'font-semibold text-primary'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button
                asChild
                variant='secondary'
                size='sm'
                className='w-fit rounded-full px-5 font-semibold'
              >
                <Link href='/apply-now' onClick={() => setIsOpen(false)}>
                  Apply now
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
