/** Verifiable stats only — no unconfirmed learner counts or satisfaction %. */

const stats = [
  { display: '1:3', label: 'Max tutor-to-learner ratio' },
  { display: '6–12', label: 'Grades we support' },
  { display: '5', label: 'Core subjects offered' },
  { display: '9', label: 'South African provinces' },
] as const;

export function StatsSection() {
  return (
    <section className='bg-[hsl(210,55%,96%)] py-20 font-sans'>
      <div className='container mx-auto px-4'>
        <h2 className='font-display mb-4 text-center text-3xl text-[hsl(210,100%,25%)] md:text-4xl'>
          Built for South African families
        </h2>
        <p className='mx-auto mb-12 max-w-2xl text-center text-muted-foreground'>
          Structured online tutoring with career guidance included in every
          package — registered as {''}
          <span className='font-medium text-foreground'>
            Ilithiyana (Pty) Ltd
          </span>
          .
        </p>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className='rounded-xl border border-[hsl(214,32%,91%)] bg-white px-6 py-8 text-center'
            >
              <p className='font-display text-4xl text-[hsl(210,100%,25%)] md:text-5xl'>
                {stat.display}
              </p>
              <p className='mt-2 text-sm font-medium text-muted-foreground'>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
