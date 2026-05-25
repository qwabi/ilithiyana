import type { Metadata } from 'next';
import { brand } from '@/lib/site-config';

export const siteDescription =
  'Online tutoring for Grades 6–12 in Pure Maths, Natural Sciences, Life Sciences, English, and Physical Science. Small groups (1:3), career guidance included. Apply for Package A or pay-per-lesson Package B.';

export function canonicalUrl(path: string): string {
  if (path === '/' || path === '') return brand.siteUrl;
  return `${brand.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

type PageMetadataOptions = {
  /** Short page title — layout template appends brand name once */
  title: string;
  description?: string;
  path: string;
  noIndex?: boolean;
};

export function pageMetadata({
  title,
  description = siteDescription,
  path,
  noIndex = false,
}: PageMetadataOptions): Metadata {
  const url = canonicalUrl(path);
  const fullTitle = `${title} | ${brand.name}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'en_ZA',
      url,
      siteName: brand.name,
      title: fullTitle,
      description,
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
      title: fullTitle,
      description,
      images: ['/og-image.jpg'],
    },
    ...(noIndex
      ? { robots: { index: false, follow: false } }
      : undefined),
  };
}

export const noIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};
