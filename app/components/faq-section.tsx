import { faqs } from '@/lib/trust-content';

export function FaqSection() {
  const faqJsonLd = {
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
    <section className='bg-white py-20 font-sans'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className='container mx-auto max-w-3xl px-4'>
        <h2 className='font-display mb-4 text-center text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          Frequently asked questions
        </h2>
        <p className='mx-auto mb-10 max-w-2xl text-center text-muted-foreground'>
          Clear answers for parents considering Ilithiyana Academics.
        </p>
        <dl className='space-y-6'>
          {faqs.map((item) => (
            <div
              key={item.question}
              className='rounded-xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)]/50 p-6'
            >
              <dt className='font-display mb-2 text-lg text-[hsl(210,100%,25%)]'>
                {item.question}
              </dt>
              <dd className='text-sm leading-relaxed text-muted-foreground'>
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
