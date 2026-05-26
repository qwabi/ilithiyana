/** Stats section — gold background, large serif numbers. */
const stats = [
  { display: '1:3', label: 'Max tutor-to-learner ratio', color: 'text-primary-dark' },
  { display: '6–12', label: 'Grades we support', color: 'text-primary-dark' },
  { display: '5', label: 'Core subjects offered', color: 'text-primary-dark' },
  { display: '9', label: 'South African provinces', color: 'text-primary-dark' },
] as const;

export function StatsSection() {
  return (
    <section className='bg-secondary py-16 font-sans'>
      <div className='container mx-auto px-4'>

        {/* Eyebrow */}
        <p className='mb-10 text-center text-xs font-bold uppercase tracking-widest text-secondary-foreground/60'>
          The Ilithiyana difference
        </p>

        {/* Stats row */}
        <div className='grid grid-cols-2 gap-6 md:grid-cols-4'>
          {stats.map((stat) => (
            <div key={stat.label} className='text-center'>
              <p className='font-display text-5xl leading-none text-primary-dark md:text-6xl'>
                {stat.display}
              </p>
              <p className='mt-3 text-sm font-semibold text-secondary-foreground/75'>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Registered business note */}
        <p className='mt-10 text-center text-xs text-secondary-foreground/50'>
          Ilithiyana (Pty) Ltd · Reg. 2020/652431/07 · POPIA compliant
        </p>
      </div>
    </section>
  );
}
