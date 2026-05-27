import { brand, contact, packages } from '@/lib/site-config';
import { founder } from '@/lib/trust-content';

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${brand.siteUrl}/#organization`,
    name: brand.name,
    legalName: brand.legalName,
    url: brand.siteUrl,
    email: contact.email,
    telephone: contact.phoneTel,
    foundingDate: String(founder.foundedYear),
    founder: {
      '@type': 'Person',
      '@id': `${brand.siteUrl}/about#founder`,
      name: founder.name,
    },
    description:
      'Structured online group tutoring for South African learners in Grades 6–12 on the CAPS curriculum. Small groups (1:3), career guidance included.',
    areaServed: {
      '@type': 'Country',
      name: 'South Africa',
    },
    offers: packages.map((pkg) => ({
      '@type': 'Offer',
      name: pkg.name,
      price: (pkg.amountCents / 100).toFixed(2),
      priceCurrency: 'ZAR',
      description: pkg.features.join('. '),
      url: `${brand.siteUrl}/apply-now`,
      availability: 'https://schema.org/InStock',
    })),
  };
}
