import { brand, contact } from '@/lib/site-config';
import { founder } from '@/lib/trust-content';

export function getFounderPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${brand.siteUrl}/about#founder`,
    name: founder.name,
    jobTitle: founder.title,
    image: `${brand.siteUrl}${founder.image}`,
    worksFor: {
      '@type': 'EducationalOrganization',
      '@id': `${brand.siteUrl}/#organization`,
      name: brand.name,
    },
    url: `${brand.siteUrl}/about`,
    email: contact.email,
    telephone: contact.phoneTel,
    nationality: {
      '@type': 'Country',
      name: 'South Africa',
    },
  };
}
