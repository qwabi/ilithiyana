export function StepHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className='mb-6 text-center'>
      <h1 className='[font-family:var(--font-dm-serif),serif] text-2xl text-[hsl(210,100%,25%)] sm:text-3xl'>
        {title}
      </h1>
      {description ? (
        <p className='mt-2 text-sm text-muted-foreground'>{description}</p>
      ) : null}
    </header>
  );
}
