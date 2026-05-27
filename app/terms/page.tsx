import Link from 'next/link';
import type { Metadata } from 'next';
import { brand, contact, packages } from '@/lib/site-config';
import { pageMetadata } from '@/lib/seo';
import { policyLastUpdated } from '@/lib/trust-content';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Enrolment',
  description: `Enrolment terms for ${brand.name} — packages, billing, pausing, and online tutoring expectations.`,
  path: '/terms',
});

export default function TermsPage() {
  return (
    <div className='container mx-auto max-w-3xl px-4 py-12 md:py-16 font-sans'>
      <h1 className='font-display mb-2 text-4xl text-[hsl(210,100%,25%)]'>
        Terms of enrolment
      </h1>
      <p className='mb-8 text-sm text-muted-foreground'>
        Last updated: {policyLastUpdated} · {brand.legalName} (
        {brand.registrationNumber})
      </p>

      <div className='space-y-8 text-sm leading-relaxed text-muted-foreground'>
        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            1. Agreement
          </h2>
          <p>
            By applying and paying for {brand.name}, you enter into an
            agreement with {brand.legalName} for online tutoring services
            described on this website. These terms apply to parents and
            guardians enrolling learners in Grades 6–12.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            2. Services
          </h2>
          <p>
            Ilithiyana provides live online group tutoring (maximum three
            learners per tutor), career guidance sessions, and administrative
            support including scheduling and progress reporting. Sessions are
            delivered online via Google Meet unless otherwise agreed in writing.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            3. Packages and fees
          </h2>
          <ul className='list-disc space-y-2 pl-5'>
            <li>
              <strong className='text-foreground'>{packages[0].name}</strong> —{' '}
              {packages[0].price}: {packages[0].features[0]};{' '}
              {packages[0].features[1]}.
            </li>
            <li>
              <strong className='text-foreground'>{packages[1].name}</strong> —{' '}
              {packages[1].price}: {packages[1].features[0]};{' '}
              {packages[1].features[1]}.
            </li>
          </ul>
          <p className='mt-3'>
            Fees are in South African Rand. Prices on the website at the time of
            application apply unless you receive written confirmation of a
            different rate.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            4. Payment
          </h2>
          <p>
            Payments are processed through PayFast. You are responsible for
            completing payment by the due date for your package. Failure to pay
            may result in paused access to classes until the account is brought
            up to date.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            5. Scheduling and attendance
          </h2>
          <p>
            Session days and times are agreed between your family and the
            assigned tutor based on the school schedule. Learners are expected
            to attend scheduled sessions and complete agreed work. Repeated
            unexcused absences may affect placement or continuation — we will
            discuss this with you first.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            6. Pausing and cancellation
          </h2>
          <p>
            Monthly packages can be paused when tutoring is not required (for
            example school holidays), subject to notice before the next billing
            cycle. There is no multi-year lock-in. To cancel, contact us before
            your next payment date. Refunds are considered case by case for
            unused prepaid periods and documented payment errors.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            7. Group format (1:3)
          </h2>
          <p>
            Tutoring is delivered in small groups of up to three learners per
            tutor. This is core to the programme and pricing. One-on-one private
            tutoring at the same monthly rate is not offered.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            8. Conduct and online safety
          </h2>
          <p>
            Learners must behave respectfully in online sessions. Recording or
            sharing session content without permission is not allowed. Parents
            are responsible for providing a suitable learning environment and
            internet access.
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            9. Privacy
          </h2>
          <p>
            Personal information is handled as described in our{' '}
            <Link href='/privacy' className='text-primary hover:underline'>
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className='font-display mb-3 text-xl text-[hsl(210,100%,25%)]'>
            10. Contact
          </h2>
          <p>
            Questions about these terms:{' '}
            <a
              href={`mailto:${contact.email}`}
              className='text-primary hover:underline'
            >
              {contact.email}
            </a>{' '}
            or {contact.phone}.
          </p>
        </section>
      </div>

      <p className='mt-10 text-sm'>
        <Link href='/apply-now' className='text-primary hover:underline'>
          ← Apply for tutoring
        </Link>
      </p>
    </div>
  );
}
