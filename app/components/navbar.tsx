'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  navLinks,
  onboardingStartPath,
  parentLoginPath,
} from '@/lib/site-config';

const navLinkClass =
  'text-[13px] font-medium text-muted-foreground transition-colors hover:text-primary';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const primaryLinks = navLinks.filter((link) => link.href !== onboardingStartPath);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className='fixed left-0 right-0 top-0 z-50 h-20 border-b border-border bg-white/95 backdrop-blur-sm'>
      <div className='container mx-auto px-4'>
        <div className='flex h-20 items-center justify-between'>

          {/* Logo */}
          <Link href='/' className='flex items-center gap-2'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary'>
              <GraduationCap className='h-4 w-4 text-white' />
            </div>
            <span className='font-display text-xl leading-tight md:text-2xl'>
              <span className='text-primary-dark'>Ilithiyana</span>{' '}
              <span className='text-primary'>Academics</span>
            </span>
          </Link>

          {/* Desktop nav */}
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
            <Link
              href={parentLoginPath}
              className={cn(
                navLinkClass,
                (pathname === parentLoginPath ||
                  pathname.startsWith('/dashboard')) &&
                  'font-semibold text-primary'
              )}
            >
              Log in
            </Link>
            <Button
              asChild
              size='sm'
              className='rounded-full bg-secondary px-5 font-bold text-secondary-foreground shadow-none hover:bg-secondary/90'
            >
              <Link href={onboardingStartPath}>
                <span className='mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-secondary-foreground/40' />
                Apply now
              </Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            type='button'
            className='rounded-lg p-2 md:hidden hover:bg-muted'
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

        {/* Mobile menu */}
        {isOpen && (
          <div className='absolute left-4 right-4 top-[calc(100%+8px)] rounded-2xl border border-border bg-white p-5 shadow-xl md:hidden'>
            <div className='flex flex-col gap-4'>
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    navLinkClass + ' text-base',
                    isActive(link.href) && 'font-semibold text-primary'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={parentLoginPath}
                className={cn(
                  navLinkClass + ' text-base',
                  (pathname === parentLoginPath ||
                    pathname.startsWith('/dashboard')) &&
                    'font-semibold text-primary'
                )}
                onClick={() => setIsOpen(false)}
              >
                Log in
              </Link>
              <Button
                asChild
                className='w-fit rounded-full bg-secondary px-6 font-bold text-secondary-foreground'
              >
                <Link href={onboardingStartPath} onClick={() => setIsOpen(false)}>
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
