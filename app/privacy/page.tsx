import Link from 'next/link';
import type { Metadata } from 'next';
import { brand, contact } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';
import { policyLastUpdated } from '@/lib/trust-content';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description: `How ${brand.name} collects, uses, and protects personal information in line with POPIA.`,
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className='container mx-auto max-w-3xl px-4 py-12 md:py-16 font-sans'>
      <h1 className='font-display mb-6 text-4xl text-[hsl(210,100%,25%)]'>
        Privacy Policy
      </h1>
      <p className='mb-2 text-sm text-muted-foreground'>
        Last updated: {policyLastUpdated}
      </p>
      <p className='mb-6 text-muted-foreground'>
        {brand.legalName} ({brand.registrationNumber}) operates {brand.name}.
        This policy explains how we handle personal information when you apply,
        enrol, or contact us.
      </p>

      <section className='prose prose-slate max-w-none space-y-4 text-sm text-muted-foreground'>
        <h2 className='font-display text-xl text-[hsl(210,100%,25%)]'>
          Information we collect
        </h2>
        <p>
          When you apply or use our services we may collect parent/guardian and
          learner details, contact information, school grade and subjects,
          province, payment references, and documents you upload (such as
          academic reports).
        </p>

        <h2 className='font-display text-xl text-[hsl(210,100%,25%)]'>
          How we use it
        </h2>
        <p>
          We use this information to process applications, allocate classes,
          communicate about schedules and payments, and improve our tutoring
          programme. We do not sell personal information to third parties.
        </p>

        <h2 className='font-display text-xl text-[hsl(210,100%,25%)]'>
          Storage and security
        </h2>
        <p>
          Data is stored on secure cloud infrastructure with access limited to
          authorised staff. Payment processing is handled by PayFast; we do not
          store card details on our servers.
        </p>

        <h2 className='font-display text-xl text-[hsl(210,100%,25%)]'>
          Your rights
        </h2>
        <p>
          Under the Protection of Personal Information Act (POPIA), you may
          request access to, correction of, or deletion of your personal
          information where applicable. Contact us to exercise these rights.
        </p>

        <h2 className='font-display text-xl text-[hsl(210,100%,25%)]'>
          Contact
        </h2>
        <p>
          Email{' '}
          <a
            href={`mailto:${contact.email}`}
            className='text-primary underline-offset-2 hover:underline'
          >
            {contact.email}
          </a>{' '}
          or phone {contact.phone}.
        </p>
      </section>

      <p className='mt-10 text-sm text-muted-foreground'>
        <Link href='/apply-now' className='text-primary hover:underline'>
          ← Back to application
        </Link>
      </p>
    </div>
  );
}
