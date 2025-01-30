import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Car, Building, MessageSquare } from 'lucide-react';

const submissionTypes = [
  {
    name: 'Academics',
    icon: GraduationCap,
    href: '/admin/dashboard/submissions/academics',
    count: 15,
  },
  {
    name: 'Vehicle Care',
    icon: Car,
    href: '/admin/dashboard/submissions/vehicle-care',
    count: 8,
  },
  {
    name: 'Infrastructure',
    icon: Building,
    href: '/admin/dashboard/submissions/infrastructure',
    count: 12,
  },
  {
    name: 'Contact',
    icon: MessageSquare,
    href: '/admin/dashboard/submissions/contact',
    count: 20,
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className='text-3xl font-bold mb-6'>Admin Dashboard</h1>
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
        {submissionTypes.map((type) => (
          <Link key={type.name} href={type.href}>
            <Card className='hover:shadow-lg transition-shadow'>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  {type.name}
                </CardTitle>
                <type.icon className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{type.count}</div>
                <p className='text-xs text-muted-foreground'>
                  Total submissions
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
