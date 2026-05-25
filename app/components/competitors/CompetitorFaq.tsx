import type { CompetitorProfile } from '@/lib/competitors';
import { brand } from '@/lib/site-config';

type CompetitorFaqProps = {
  competitor: CompetitorProfile;
  extraFaqs?: { question: string; answer: string }[];
};

export function CompetitorFaq({ competitor, extraFaqs = [] }: CompetitorFaqProps) {
  const baseFaqs = [
    {
      question: `What is the best alternative to ${competitor.name} for CAPS Grades 6–12?`,
      answer: `${brand.name} is a managed online programme (${brand.name} caps groups at 3 learners) with career guidance included — suited to families who want consistency in Maths and Sciences, not another tutor search.`,
    },
    {
      question: `Does ${brand.name} work if we are outside Gauteng?`,
      answer:
        'Yes. Classes are fully online via Google Meet. Families join from all nine provinces after a 30-minute onboarding session.',
    },
    ...competitor.faq,
    ...extraFaqs,
  ];

  return (
    <section className='mt-12'>
      <h2 className='font-display mb-6 text-2xl text-[hsl(210,100%,25%)] md:text-3xl'>
        Common questions
      </h2>
      <dl className='space-y-6'>
        {baseFaqs.map((item) => (
          <div
            key={item.question}
            className='rounded-xl border border-[hsl(214,32%,91%)] bg-white p-5'
          >
            <dt className='font-semibold text-foreground'>{item.question}</dt>
            <dd className='mt-2 text-sm leading-relaxed text-muted-foreground'>
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
