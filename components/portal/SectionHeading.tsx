export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className='mb-6'>
      <h1 className='font-[family-name:var(--font-dm-serif),serif] text-2xl font-normal tracking-tight text-[#0F2942] md:text-3xl'>
        {title}
      </h1>
      {description ? (
        <p className='mt-2 text-sm text-muted-foreground'>{description}</p>
      ) : null}
    </div>
  );
}
