import { testimonials } from '@/lib/trust-content';

export function TestimonialsSection() {
  if (testimonials.length === 0) {
    return (
      <section className='bg-[hsl(210,55%,96%)] py-16 font-sans'>
        <div className='container mx-auto max-w-2xl px-4 text-center'>
          <h2 className='font-display mb-3 text-2xl text-[hsl(210,100%,25%)] md:text-3xl'>
            Parent feedback
          </h2>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            We publish parent stories here with permission as they are collected.
            When you apply, you can ask to speak with a current family about
            their experience with Ilithiyana Academics.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className='bg-[hsl(210,55%,96%)] py-20 font-sans'>
      <div className='container mx-auto px-4'>
        <h2 className='font-display mb-4 text-center text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          What parents say
        </h2>
        <p className='mx-auto mb-10 max-w-2xl text-center text-muted-foreground'>
          Feedback from families in our tutoring programme.
        </p>
        <div className='mx-auto grid max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {testimonials.map((item) => (
            <blockquote
              key={item.quote}
              className='rounded-xl border border-[hsl(214,32%,91%)] bg-white p-6'
            >
              <p className='text-sm leading-relaxed text-foreground'>
                &ldquo;{item.quote}&rdquo;
              </p>
              <footer className='mt-4 text-xs text-muted-foreground'>
                — {item.attribution}
                {item.province ? `, ${item.province}` : ''}
                {item.grade ? ` · Grade ${item.grade}` : ''}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
