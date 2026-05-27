import { brand } from '@/lib/site-config';

type FaqItem = { question: string; answer: string };

export function FaqJsonLd({ faqs }: { faqs: FaqItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export function buildDefaultFaqs(
  competitorName: string,
  competitorFaqs: FaqItem[],
): FaqItem[] {
  return [
    {
      question: `What is the best alternative to ${competitorName} in South Africa?`,
      answer: `${brand.name} offers managed online CAPS tutoring for Grades 6–12 with max 3 learners per session and career guidance included from R1,000/month.`,
    },
    {
      question: `Is ${brand.name} fully online?`,
      answer:
        'Yes. Sessions run on Google Meet. Every new family receives a 30-minute onboarding before classes start.',
    },
    ...competitorFaqs,
  ];
}
