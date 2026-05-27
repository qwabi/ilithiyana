import { getFounderPersonJsonLd } from '@/lib/person-json-ld';

export function FounderJsonLd() {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(getFounderPersonJsonLd()),
      }}
    />
  );
}
