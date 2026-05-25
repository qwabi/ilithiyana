import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  MessageSquare,
  CreditCard,
  Clock,
  UserPlus,
} from 'lucide-react';
import { getDashboardCounts } from '@/app/actions/admin-actions';

const pageTitle =
  '[font-family:var(--font-dm-serif),serif] text-3xl font-normal tracking-tight text-foreground';
const adminCard =
  'h-full rounded-xl border-[0.5px] border-border bg-white shadow-sm transition-shadow hover:shadow-md';

export default async function AdminDashboard() {
  const counts = await getDashboardCounts();

  const cards = [
    {
      name: 'Applications',
      description: `${counts.pendingApplications} pending review`,
      icon: GraduationCap,
      href: '/admin/dashboard/applications',
      count: counts.applications,
    },
    {
      name: 'Prospective parents',
      description: `${counts.awaitingPaymentLeads} awaiting payment`,
      icon: UserPlus,
      href: '/admin/dashboard/leads',
      count: counts.awaitingPaymentLeads,
    },
    {
      name: 'Subscriptions',
      description: 'Learner billing status',
      icon: CreditCard,
      href: '/admin/dashboard/subscriptions',
      count: '—',
    },
    {
      name: 'Timesheets',
      description: 'Tutor session logs',
      icon: Clock,
      href: '/admin/dashboard/timesheets',
      count: '—',
    },
    {
      name: 'Contact messages',
      description: 'General enquiries',
      icon: MessageSquare,
      href: '/admin/dashboard/submissions/contact',
      count: counts.contactMessages,
    },
  ];

  return (
    <div>
      <h1 className={`${pageTitle} mb-2`}>Admin dashboard</h1>
      <p className='mb-8 text-muted-foreground'>
        Ilithiyana Academics — manage applications and enquiries.
      </p>
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
        {cards.map((type) => (
          <Link key={type.name} href={type.href}>
            <Card className={adminCard}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-semibold text-foreground'>
                  {type.name}
                </CardTitle>
                <type.icon className='h-4 w-4 text-primary' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-foreground'>
                  {type.count}
                </div>
                <p className='text-xs text-muted-foreground'>{type.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
