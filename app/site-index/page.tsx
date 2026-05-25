import Link from 'next/link';
import type { Metadata } from 'next';
import { brand } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';
import { siteIndexPath, siteIndexSections } from '@/lib/site-index';

export const metadata: Metadata = pageMetadata({
  title: 'Site Index',
  description: `Browse all pages on ${brand.name} — marketing, resources, enrolment, parent dashboard, and admin.`,
  path: siteIndexPath,
});

export default function SiteIndexPage() {
  return (
    <div className='font-sans'>
      <div className='container mx-auto max-w-3xl px-4 py-12 md:py-16'>
        <h1 className='font-display text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          Site index
        </h1>
        <p className='mt-4 text-lg text-muted-foreground'>
          All pages on {brand.name} ({brand.siteUrl.replace(/^https?:\/\//, '')}
          ), grouped by purpose. Some areas require you to sign in.
        </p>
      </div>

      <div className='container mx-auto max-w-3xl px-4 pb-16'>
        <nav aria-label='Site sections' className='space-y-12'>
          {siteIndexSections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className='font-display text-xl text-[hsl(210,100%,25%)] md:text-2xl'>
                {section.title}
              </h2>
              {section.description ? (
                <p className='mt-2 text-sm text-muted-foreground'>
                  {section.description}
                </p>
              ) : null}
              <ul className='mt-4 divide-y divide-border rounded-xl border border-border bg-white'>
                {section.links.map((link) => {
                  const isExternalXml = link.href.endsWith('.xml');
                  const row = (
                    <>
                      <span className='font-medium text-primary'>
                        {link.label}
                      </span>
                      <span className='font-mono text-xs text-muted-foreground sm:text-right'>
                        {link.href}
                      </span>
                    </>
                  );
                  return (
                    <li key={`${section.id}-${link.href}-${link.label}`}>
                      {isExternalXml ? (
                        <a
                          href={link.href}
                          className='flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[hsl(210,55%,96%)] sm:flex-row sm:items-center sm:justify-between'
                        >
                          {row}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className='flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-[hsl(210,55%,96%)] sm:flex-row sm:items-center sm:justify-between'
                        >
                          {row}
                        </Link>
                      )}
                      {link.description ? (
                        <p className='border-t border-border/60 px-4 py-2 text-xs text-muted-foreground'>
                          {link.description}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        <p className='mt-12 text-center text-sm text-muted-foreground'>
          <Link href='/' className='text-primary underline-offset-2 hover:underline'>
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
