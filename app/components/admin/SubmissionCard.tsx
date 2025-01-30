import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface SubmissionCardProps {
  type: string;
  title: string;
  date: Date;
  status: 'new' | 'in-progress' | 'completed';
  details: Record<string, string>;
}

export function SubmissionCard({
  type,
  title,
  date,
  status,
  details,
}: SubmissionCardProps) {
  return (
    <Card className='w-full'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>{title}</CardTitle>
          <Badge
            variant={
              status === 'new'
                ? 'default'
                : status === 'in-progress'
                ? 'secondary'
                : 'outline'
            }
            className='capitalize'
          >
            {status}
          </Badge>
        </div>
        <div className='text-sm text-muted-foreground'>
          <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
          <span className='mx-2'>•</span>
          <Badge variant='outline'>{type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className='grid gap-2'>
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className='grid grid-cols-3 gap-2 text-sm'>
              <span className='font-medium text-muted-foreground'>{key}:</span>
              <span className='col-span-2'>{value.toString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
