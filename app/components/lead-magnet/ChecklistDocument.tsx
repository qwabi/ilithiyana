import Link from 'next/link';
import {
  checklistIntro,
  decisionChecklist,
  externalResources,
  gradePathways,
  subjectsNotOfferedNote,
} from '@/lib/checklist-content';
import { brand, contact } from '@/lib/site-config';
import { subjectDetails } from '@/lib/trust-content';
import { ChecklistPrintActions } from '@/app/components/lead-magnet/ChecklistPrintActions';

type ChecklistDocumentProps = {
  showActions?: boolean;
};

export function ChecklistDocument({ showActions = true }: ChecklistDocumentProps) {
  return (
    <article className='checklist-document mx-auto max-w-3xl px-4 py-10 font-sans'>
      {showActions ? <ChecklistPrintActions /> : null}

      <header className='mb-8 border-b border-border pb-6'>
        <p className='text-xs font-semibold uppercase tracking-widest text-primary'>
          {brand.name}
        </p>
        <h1 className='font-display mt-2 text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          CAPS Subject Choice Checklist
        </h1>
        <p className='mt-3 text-muted-foreground'>{checklistIntro}</p>
      </header>

      {gradePathways.map((section) => (
        <section key={section.grades} className='mb-8'>
          <h2 className='font-display text-xl text-foreground'>
            {section.grades} — {section.title}
          </h2>
          <ul className='mt-3 list-disc space-y-2 pl-5 text-muted-foreground'>
            {section.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}

      <section className='mb-8'>
        <h2 className='font-display text-xl text-foreground'>
          Subjects Ilithiyana tutors (CAPS)
        </h2>
        <ul className='mt-3 space-y-2'>
          {subjectDetails.map((s) => (
            <li
              key={s.name}
              className='rounded-lg border border-border bg-[hsl(210,55%,98%)] p-3 text-sm'
            >
              <strong className='text-foreground'>{s.name}</strong>
              <span className='text-muted-foreground'> · {s.grades}</span>
              <p className='mt-1 text-muted-foreground'>{s.summary}</p>
            </li>
          ))}
        </ul>
        <p className='mt-4 text-sm text-muted-foreground'>
          {subjectsNotOfferedNote}
        </p>
      </section>

      <section className='mb-8'>
        <h2 className='font-display text-xl text-foreground'>
          Your action checklist
        </h2>
        <ul className='mt-4 space-y-3'>
          {decisionChecklist.map((item) => (
            <li
              key={item}
              className='flex gap-3 text-sm text-muted-foreground'
            >
              <span
                className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary text-xs text-primary'
                aria-hidden
              >
                ☐
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className='mb-8'>
        <h2 className='font-display text-xl text-foreground'>
          Helpful South African resources
        </h2>
        <ul className='mt-3 list-disc space-y-1 pl-5 text-sm'>
          {externalResources.map((r) => (
            <li key={r.href}>
              <a
                href={r.href}
                className='text-primary underline-offset-2 hover:underline'
                target='_blank'
                rel='noopener noreferrer'
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className='checklist-no-print border-t border-border pt-6 text-sm text-muted-foreground'>
        <p>
          Need tutoring with career guidance included? Package A is R1,000/month
          (8 lesson hours). Package B is R175 per lesson.
        </p>
        <p className='mt-2'>
          {contact.email} · {contact.phone}
        </p>
        <p className='mt-4'>
          <Link href='/apply-now' className='font-medium text-primary'>
            Apply at ilithiyana.co.za/apply-now →
          </Link>
        </p>
      </footer>
    </article>
  );
}
