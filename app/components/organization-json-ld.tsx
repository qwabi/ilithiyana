import { getOrganizationJsonLd } from '@/lib/organization-json-ld';

export function OrganizationJsonLd() {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(getOrganizationJsonLd()),
      }}
    />
  );
}
