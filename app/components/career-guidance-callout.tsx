import { GraduationCap, BookOpen, Briefcase, Users } from 'lucide-react';
import Link from 'next/link';

const bullets = [
  { Icon: BookOpen,    text: 'University applications and requirements' },
  { Icon: Briefcase,  text: 'Subject choices for your career path' },
  { Icon: Users,      text: 'Bursary and NSFAS guidance' },
];

export function CareerGuidanceCallout() {
  return (
    <section className='relative overflow-hidden bg-accent-light py-20 font-sans'>

      {/* Decorative blobs */}
      <div className='pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20' aria-hidden />
      <div className='pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-secondary/20' aria-hidden />

      <div className='container relative z-10 mx-auto px-4'>
        <div className='mx-auto max-w-2xl text-center'>

          {/* Icon */}
          <div className='mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent shadow-lg'>
            <GraduationCap className='h-10 w-10 text-white' />
          </div>

          {/* Badge */}
          <span className='mb-4 inline-block rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-secondary-foreground'>
            Included in every package — free
          </span>

          <h2 className='font-display mb-4 text-3xl text-primary-dark md:text-4xl'>
            Weekly career guidance{' '}
            <em className='not-italic text-accent-dark'>every Monday</em>
          </h2>

          <p className='mb-8 text-base leading-relaxed text-muted-foreground'>
            Every Monday, all enrolled learners join a live group session. No extra cost,
            no booking required — it comes with being part of Ilithiyana.
          </p>

          {/* Bullet points */}
          <div className='mb-8 flex flex-col items-center gap-3 text-sm'>
            {bullets.map(({ Icon, text }) => (
              <div key={text} className='flex items-center gap-3 text-muted-foreground'>
                <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20'>
                  <Icon className='h-4 w-4 text-accent-dark' />
                </div>
                {text}
              </div>
            ))}
          </div>

          <Link
            href='/career-guidance'
            className='inline-flex items-center gap-2 rounded-full border-2 border-accent-dark px-6 py-2.5 text-sm font-bold text-accent-dark transition-colors hover:bg-accent hover:text-white'
          >
            Learn more about career guidance →
          </Link>
        </div>
      </div>
    </section>
  );
}
