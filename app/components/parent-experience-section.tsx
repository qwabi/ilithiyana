import { parentExperience } from '@/lib/trust-content';
import {
  Calendar,
  FileText,
  GraduationCap,
  Video,
  type LucideIcon,
} from 'lucide-react';

const icons: LucideIcon[] = [Video, FileText, Calendar, GraduationCap];

export function ParentExperienceSection() {
  return (
    <section className='bg-white py-20 font-sans'>
      <div className='container mx-auto px-4'>
        <h2 className='font-display mb-4 text-center text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          What families receive
        </h2>
        <p className='mx-auto mb-12 max-w-2xl text-center text-muted-foreground'>
          A managed programme — not just lesson links. Here is what happens
          after you apply and enrol.
        </p>
        <div className='mx-auto grid max-w-4xl gap-6 sm:grid-cols-2'>
          {parentExperience.map((item, index) => {
            const Icon = icons[index] ?? Video;
            return (
              <article
                key={item.title}
                className='rounded-xl border border-[hsl(214,32%,91%)] border-t-4 border-t-primary bg-[hsl(210,55%,96%)]/30 p-6'
              >
                <Icon
                  className='mb-3 h-8 w-8 text-primary'
                  aria-hidden
                />
                <h3 className='font-display mb-2 text-lg text-[hsl(210,100%,25%)]'>
                  {item.title}
                </h3>
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
