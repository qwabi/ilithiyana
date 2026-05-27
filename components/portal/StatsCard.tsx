import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StatsCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className='rounded-xl border border-border bg-white shadow-sm'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className='text-2xl font-bold text-[#0F2942]'>{value}</p>
        {hint ? (
          <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
