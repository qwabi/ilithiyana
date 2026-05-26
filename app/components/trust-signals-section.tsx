import { Users, FileText, GraduationCap, Calendar } from 'lucide-react';
import { positioning } from '@/lib/site-config';

const signals = [
  {
    Icon: Users,
    iconBg: 'bg-primary',
    badge: '1:3 ratio',
    badgeBg: 'bg-primary-light text-primary',
    title: 'Never lost in a crowd',
    description:
      'Maximum 3 learners per tutor — always. Your child is seen, heard, and helped every single session, not just when they raise their hand.',
    img: '/students-looking-at-a-textbook-2-students.jpg',
    imgAlt: 'Two students studying with a textbook',
    flip: false,
  },
  {
    Icon: GraduationCap,
    iconBg: 'bg-accent',
    badge: 'Free with every plan',
    badgeBg: 'bg-accent-light text-accent-dark',
    title: 'Career guidance, included',
    description:
      'Weekly Monday sessions on university applications, subject choices, bursaries, and life-after-school planning — in every package, at zero extra cost.',
    img: '/african-teacher-teaching-students-listening.jpg',
    imgAlt: 'Teacher with students listening in class',
    flip: true,
  },
  {
    Icon: FileText,
    iconBg: 'bg-secondary',
    badge: 'Every term',
    badgeBg: 'bg-secondary-light text-secondary-foreground',
    title: 'You see the progress',
    description:
      'Term reports on strengths, gaps, and what to focus on next. Not just session attendance — actual insight into how your child is growing.',
    img: '/student-answering-questions-on-the-board-with-teacher.jpg',
    imgAlt: 'Student answering at the board with teacher nearby',
    flip: false,
  },
  {
    Icon: Calendar,
    iconBg: 'bg-light-blue',
    badge: 'Always open',
    badgeBg: 'bg-light-blue-light text-primary-dark',
    title: 'Apply any time',
    description:
      `No fixed intake dates. ${positioning.intake} Your child can start when they need help — not when an arbitrary calendar allows.`,
    img: '/students-happy.jpg',
    imgAlt: 'Happy students at school',
    flip: true,
  },
];

export function TrustSignalsSection() {
  return (
    <section className='bg-white py-24 font-sans'>
      <div className='container mx-auto px-4'>

        {/* Section heading */}
        <div className='mx-auto mb-20 max-w-xl text-center'>
          <p className='overline mb-3 text-primary'>Why families choose us</p>
          <h2 className='font-display text-3xl text-primary-dark md:text-4xl'>
            Practical support that{' '}
            <em className='not-italic text-secondary'>actually shows up</em>
          </h2>
        </div>

        {/* Zigzag rows */}
        <div className='space-y-24'>
          {signals.map((s) => (
            <div
              key={s.title}
              className={`grid items-center gap-12 md:grid-cols-2 ${
                s.flip ? 'md:[&>*:first-child]:order-2' : ''
              }`}
            >
              {/* Text side */}
              <div className='space-y-5'>
                {/* Icon + badge row */}
                <div className='flex items-center gap-3'>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.iconBg}`}>
                    <s.Icon className='h-6 w-6 text-white' />
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.badgeBg}`}>
                    {s.badge}
                  </span>
                </div>

                <h3 className='font-display text-2xl text-primary-dark md:text-3xl'>
                  {s.title}
                </h3>
                <p className='text-base leading-relaxed text-muted-foreground'>
                  {s.description}
                </p>
              </div>

              {/* Image side */}
              <div className='relative'>
                {/* Coloured blob behind image */}
                <div
                  className={`absolute -inset-4 rounded-[2.5rem] opacity-30 ${
                    s.flip ? 'bg-secondary-light' : 'bg-primary-light'
                  }`}
                />
                <div className='relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border-4 border-white shadow-xl'>
                  <img
                    src={s.img}
                    alt={s.imgAlt}
                    className='h-full w-full object-cover'
                    loading='lazy'
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
