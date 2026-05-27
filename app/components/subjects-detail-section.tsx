import { subjectDetails, subjectsNotOffered } from '@/lib/trust-content';

export function SubjectsDetailSection() {
  return (
    <section className='bg-[hsl(210,55%,96%)] py-20 font-sans'>
      <div className='container mx-auto px-4'>
        <h2 className='font-display mb-4 text-center text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          Subjects we tutor (CAPS)
        </h2>
        <p className='mx-auto mb-12 max-w-2xl text-center text-muted-foreground'>
          Specialist online support across five core subjects. We are upfront
          about what we do not teach.
        </p>
        <div className='mx-auto grid max-w-4xl gap-4 md:grid-cols-2'>
          {subjectDetails.map((subject) => (
            <article
              key={subject.name}
              className='rounded-xl border border-[hsl(214,32%,91%)] bg-white p-6'
            >
              <div className='mb-2 flex flex-wrap items-baseline justify-between gap-2'>
                <h3 className='font-display text-xl text-[hsl(210,100%,25%)]'>
                  {subject.name}
                </h3>
                <span className='text-xs font-medium uppercase tracking-wide text-primary'>
                  {subject.grades}
                </span>
              </div>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                {subject.summary}
              </p>
            </article>
          ))}
        </div>
        <p className='mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground'>
          <span className='font-medium text-foreground'>Not offered:</span>{' '}
          {subjectsNotOffered.join(', ')}. Please choose only from the subjects
          listed above when you apply.
        </p>
      </div>
    </section>
  );
}
