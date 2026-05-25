import Link from 'next/link';
import { careerGuidance } from '@/lib/trust-content';
import { CheckCircle } from 'lucide-react';

type CareerGuidanceSectionProps = {
  showResources?: boolean;
  id?: string;
};

export function CareerGuidanceSection({
  showResources = true,
  id = 'career-guidance',
}: CareerGuidanceSectionProps) {
  return (
    <section id={id} className='bg-white py-20 font-sans scroll-mt-24'>
      <div className='container mx-auto max-w-3xl px-4'>
        <h2 className='font-display mb-4 text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          Career guidance (included)
        </h2>
        <p className='mb-8 text-lg leading-relaxed text-muted-foreground'>
          {careerGuidance.intro}
        </p>
        <ul className='space-y-3'>
          {careerGuidance.topics.map((topic) => (
            <li key={topic} className='flex items-start gap-2 text-sm'>
              <CheckCircle
                className='mt-0.5 h-5 w-5 shrink-0 text-accent'
                aria-hidden
              />
              <span className='text-muted-foreground'>{topic}</span>
            </li>
          ))}
        </ul>
        {showResources ? (
          <div className='mt-10 rounded-xl border border-[hsl(214,32%,91%)] bg-[hsl(210,55%,96%)]/50 p-6'>
            <h3 className='font-display mb-3 text-lg text-[hsl(210,100%,25%)]'>
              Helpful South African resources
            </h3>
            <p className='mb-4 text-sm text-muted-foreground'>
              We point families to trusted public sources during career
              sessions. These links open in a new tab:
            </p>
            <ul className='space-y-2 text-sm'>
              {careerGuidance.resources.map((resource) => (
                <li key={resource.href}>
                  <a
                    href={resource.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-medium text-primary hover:underline'
                  >
                    {resource.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className='mt-8 text-sm text-muted-foreground'>
          Career guidance is included in{' '}
          <Link href='/apply-now' className='text-primary hover:underline'>
            Package A and Package B
          </Link>
          .{' '}
          {!showResources ? (
            <>
              <Link
                href='/career-guidance'
                className='text-primary hover:underline'
              >
                Read more about career guidance
              </Link>
              .
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}
