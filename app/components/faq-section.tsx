'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
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
    <section className="bg-white py-20 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="container mx-auto max-w-3xl px-4">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-display text-3xl text-[hsl(210,100%,25%)] md:text-4xl">
            Frequently asked questions
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.05} className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-muted-foreground">
            Clear answers for parents considering Ilithiyana Academics.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((item) => (
              <AccordionItem
                key={item.question}
                value={item.question}
                className="rounded-xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)]/50 px-4"
              >
                <AccordionTrigger className="font-display text-left text-lg text-[hsl(210,100%,25%)] hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
}
